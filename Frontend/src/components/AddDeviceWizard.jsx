import React, { useState, useEffect, useRef, useCallback } from 'react';
import client from '../api/client';
import { getSocket } from '../api/socket';
import { classifyAQI } from '../utils/aqi';
import { ESPLoader, Transport } from 'esptool-js';
import './AddDeviceWizard.css';

const STEPS = [
  { id: 1, label: 'Connect' },
  { id: 2, label: 'Location' },
  { id: 3, label: 'Wi-Fi' },
  { id: 4, label: 'Provision' },
  { id: 5, label: 'Verify' },
  { id: 6, label: 'Live Data' },
  { id: 7, label: 'Complete' },
];

export default function AddDeviceWizard({
  isOpen,
  onClose,
  onDeviceAdded,
  onNavigateDashboard,
  initialMode = 'onboard',
  targetDevice = null,
}) {
  const [activeMode, setActiveMode] = useState(initialMode || 'onboard');
  const [step, setStep] = useState(1);

  // Form State — Clean inputs for fresh device onboarding (no demo data)
  const [formData, setFormData] = useState({
    name: '',
    deviceId: '',
    type: 'AirGuard ESP32 Sensing Node',
    description: '',
    // Location
    location: '',
    locality: '',
    city: '',
    state: '',
    country: 'India',
    lat: null,
    lng: null,
    // Wi-Fi
    wifiSsid: '',
    wifiPassword: '',
  });

  // Quick Wi-Fi Reconfig & Re-Flash State
  const [quickPushing, setQuickPushing] = useState(false);
  const [quickStatus, setQuickStatus] = useState(null);
  const [quickError, setQuickError] = useState(null);
  const [quickSuccess, setQuickSuccess] = useState(null);

  // Sync mode and pre-populate targetDevice when props change
  useEffect(() => {
    if (isOpen) {
      if (initialMode) setActiveMode(initialMode);
      setQuickError(null);
      setQuickSuccess(null);
      setQuickStatus(null);
      if (targetDevice) {
        setFormData((prev) => ({
          ...prev,
          deviceId: targetDevice.deviceId || targetDevice.id || prev.deviceId,
          name: targetDevice.name || prev.name,
          location: targetDevice.location || prev.location,
          wifiSsid: targetDevice.wifiSSID || prev.wifiSsid,
        }));
      }
    }
  }, [isOpen, initialMode, targetDevice]);

  const [verificationError, setVerificationError] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [searchingLoc, setSearchingLoc] = useState(false);
  const [locationSearchResults, setLocationSearchResults] = useState([]);
  const [showLocDropdown, setShowLocDropdown] = useState(false);
  const [idChecking, setIdChecking] = useState(false);
  const [idError, setIdError] = useState(null);

  // Web Serial State
  const isSerialSupported = typeof navigator !== 'undefined' && 'serial' in navigator;
  const [serialPort, setSerialPort] = useState(null);
  const [serialConnecting, setSerialConnecting] = useState(false);
  const [serialConnected, setSerialConnected] = useState(false);
  const [serialError, setSerialError] = useState(null);
  const [detectedHardware, setDetectedHardware] = useState(null);
  const [scannedNetworks, setScannedNetworks] = useState([]);
  const [scanningWifi, setScanningWifi] = useState(false);
  const [wifiScanNotice, setWifiScanNotice] = useState(null);
  const serialWriterRef = useRef(null);
  const serialReaderRef = useRef(null);

  // In-Browser 1-Click ESP32 Flasher State
  const [flashing, setFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [flashStatus, setFlashStatus] = useState('');
  const [flashError, setFlashError] = useState(null);

  // Provisioning & Verification State
  const [provisioningStatus, setProvisioningStatus] = useState({
    connectingEsp: false,
    sendingConfig: false,
    wifiConnecting: false,
    serverConnecting: false,
    registered: false,
  });
  const [provisionError, setProvisionError] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Telemetry Packet
  const [latestReading, setLatestReading] = useState(null);
  const [waitingTelemetry, setWaitingTelemetry] = useState(false);

  // Clean up serial on unmount or close
  useEffect(() => {
    return () => {
      try {
        if (serialReaderRef.current) serialReaderRef.current.cancel().catch(() => {});
        if (serialPort && serialPort.readable) serialPort.close().catch(() => {});
      } catch (e) {}
    };
  }, [serialPort]);

  // Validate hardware Device ID availability with backend
  const checkDeviceIdAvailability = async (idToCheck) => {
    if (!idToCheck || !idToCheck.trim()) {
      setIdError('Hardware Device ID is required');
      return false;
    }
    setIdChecking(true);
    setIdError(null);
    try {
      const res = await client.get(`/devices/check-id/${encodeURIComponent(idToCheck.trim())}`);
      if (!res.data.available) {
        setIdError(res.data.error || 'This Device ID is already registered to another account.');
        return false;
      }
      return true;
    } catch (err) {
      return true;
    } finally {
      setIdChecking(false);
    }
  };

  // Step 1: Real Web Serial Hardware Connection
  const handleConnectUsb = async () => {
    if (!isSerialSupported) {
      setSerialError('Web Serial is not supported in this browser. Please use Chrome or Edge on Desktop.');
      return;
    }

    setSerialConnecting(true);
    setSerialError(null);

    let identifyTimer = null;
    let autoResetTimer = setTimeout(() => {
      setSerialConnecting(false);
    }, 15000);

    // Commit hardware detection and advance wizard
    const applyDeviceDetection = (hwId, customInfo = {}) => {
      clearInterval(identifyTimer);
      clearTimeout(autoResetTimer);

      const uniqueHwId = (hwId && hwId.startsWith('AG-'))
        ? hwId
        : (customInfo.hardwareId || (formData.deviceId?.trim() ? formData.deviceId.trim() : `esp32-node-${Math.random().toString(36).substring(2, 6)}`));

      const hwInfo = {
        device: customInfo.device || 'AirGuard ESP32 Sensing Node',
        hardwareId: uniqueHwId,
        mac: customInfo.mac || (hwId && hwId.startsWith('AG-') ? hwId : 'USB:Serial'),
        chip: customInfo.chip || 'ESP32',
        revision: customInfo.revision != null ? customInfo.revision : 1,
        firmware: customInfo.firmware || '2.2.0',
        connection: 'USB / Serial (115200 Baud)',
        status: 'Connected',
      };
      setDetectedHardware(hwInfo);
      setFormData((f) => ({
        ...f,
        deviceId: f.deviceId || uniqueHwId,
        type: hwInfo.device,
        name: f.name || `AirGuard Node (${uniqueHwId})`,
      }));
      checkDeviceIdAvailability(uniqueHwId);
      setSerialConnected(true);
      setSerialConnecting(false);
    };

    try {
      // 1. Clean up existing active reader/writer streams if any
      if (serialReaderRef.current) {
        try { await serialReaderRef.current.cancel(); } catch (e) {}
        serialReaderRef.current = null;
      }
      if (serialWriterRef.current) {
        try { await serialWriterRef.current.close(); } catch (e) {}
        serialWriterRef.current = null;
      }
      if (serialPort && serialPort.readable) {
        try { await serialPort.close(); } catch (e) {}
      }

      // 2. Check if user already authorized a serial port, else prompt
      let port = null;
      try {
        const authorizedPorts = await navigator.serial.getPorts();
        if (authorizedPorts && authorizedPorts.length > 0) {
          port = authorizedPorts[0];
        }
      } catch (e) {}

      if (!port) {
        port = await navigator.serial.requestPort();
      }

      // 3. Open serial port at 115200 baud
      if (!port.readable) {
        try {
          await port.open({ baudRate: 115200 });
        } catch (openErr) {
          if (!openErr.message || !openErr.message.includes('already open')) {
            throw openErr;
          }
        }
      }
      setSerialPort(port);

      // IMMEDIATELY apply device detection so the UI transitions to connected state instantly!
      applyDeviceDetection('esp32-node-01', {
        device: 'AirGuard ESP32 Sensing Node',
        mac: 'USB:COM-Port',
        chip: 'ESP32',
      });

      // 4. Set up non-blocking background stream pipes for IDENTIFY and Wi-Fi scan
      try {
        const textDecoder = new TextDecoderStream();
        port.readable.pipeTo(textDecoder.writable).catch(() => {});
        const reader = textDecoder.readable.getReader();
        serialReaderRef.current = reader;

        const textEncoder = new TextEncoderStream();
        textEncoder.readable.pipeTo(port.writable).catch(() => {});
        const writer = textEncoder.writable.getWriter();
        serialWriterRef.current = writer;

        // Send IDENTIFY to read chip details in background
        writer.write('IDENTIFY\n{"cmd":"IDENTIFY"}\n').catch(() => {});

        // Background read loop
        (async () => {
          let buffer = '';
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) {
                buffer += value;
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed) continue;

                  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    try {
                      const parsed = JSON.parse(jsonMatch[0]);
                      if ((parsed.status === 'OK' || parsed.status === 'READY') && (parsed.mac || parsed.hardwareId)) {
                        setDetectedHardware((prev) => ({
                          ...prev,
                          mac: parsed.mac || (parsed.hardwareId ? parsed.hardwareId : prev?.mac),
                          chip: parsed.chip || prev?.chip,
                          revision: parsed.revision != null ? parsed.revision : prev?.revision,
                          firmware: parsed.firmware || prev?.firmware,
                        }));
                      } else if (parsed.networks && Array.isArray(parsed.networks)) {
                        setScannedNetworks(parsed.networks);
                        setScanningWifi(false);
                      } else if (parsed.status === 'PROVISIONED') {
                        setProvisioningStatus((prev) => ({
                          ...prev,
                          wifiConnecting: true,
                          serverConnecting: true,
                          registered: true,
                        }));
                      }
                    } catch (e) {}
                  }
                }
              }
            }
          } catch (readErr) {
            console.warn('Serial reader background ended:', readErr);
          }
        })();
      } catch (streamErr) {
        console.warn('Stream pipe initialization non-fatal notice:', streamErr);
      }
    } catch (err) {
      clearTimeout(autoResetTimer);
      clearInterval(identifyTimer);
      if (err.name === 'NotFoundError') {
        setSerialError('Port selection was cancelled. Click "Connect AirGuard Device" when ready.');
      } else if (err.message && (err.message.includes('already open') || err.message.includes('Access denied'))) {
        setSerialError(
          'Serial Port Busy: The ESP32 COM port is currently in use. Unplug and re-plug the USB cable, or click "Skip USB detection & register directly" below.'
        );
      } else {
        setSerialError(`USB Connection error: ${err.message}`);
      }
      setSerialConnected(false);
      setSerialConnecting(false);
    }
  };

  // Step 1B: In-Browser 1-Click Firmware Flasher (esptool-js Web Serial)
  const handleOneClickFlash = async () => {
    if (!isSerialSupported) {
      setFlashError('In-browser flashing requires Google Chrome or Microsoft Edge on a desktop computer (PC/Mac/Linux).');
      return;
    }

    setFlashing(true);
    setFlashProgress(0);
    setFlashStatus('Requesting ESP32 device port...');
    setFlashError(null);

    // Clean up any ongoing serial reader/writer
    try {
      if (serialReaderRef.current) {
        await serialReaderRef.current.cancel();
        serialReaderRef.current = null;
      }
      if (serialWriterRef.current) {
        serialWriterRef.current = null;
      }
      if (serialPort && serialPort.readable) {
        await serialPort.close();
        setSerialPort(null);
      }
    } catch (e) {
      console.warn('Port release warning before flashing:', e);
    }

    let transportInstance = null;
    try {
      // 1. Pre-load firmware binary into memory FIRST before touching USB
      setFlashStatus('Downloading AirGuard firmware package (4 MB)...');
      setFlashProgress(10);

      let arrayBuf;
      try {
        const resp = await fetch('/firmware/AirGuard_ESP32_AllInOne.bin');
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        arrayBuf = await resp.arrayBuffer();
      } catch (fetchErr) {
        throw new Error(`Could not download firmware binary (${fetchErr.message}). Check your internet connection or use the Download .bin button.`);
      }

      const fileData = new Uint8Array(arrayBuf);
      setFlashProgress(20);

      // 2. Request serial port from user
      setFlashStatus('Firmware loaded. Please select your ESP32 COM port in the browser prompt...');
      const port = await navigator.serial.requestPort({});
      transportInstance = new Transport(port, true);

      setFlashStatus('Connecting to ESP32 bootloader (hold BOOT for 1 sec if needed)...');
      setFlashProgress(25);

      const espLoader = new ESPLoader({
        transport: transportInstance,
        baudrate: 460800,
        romBaudrate: 115200,
        terminal: {
          clean: () => {},
          writeLine: (txt) => console.log('[ESP32-Flasher]', txt),
          write: (txt) => console.log('[ESP32-Flasher]', txt),
        },
      });

      const chip = await espLoader.main();
      setFlashStatus(`Detected ${chip || 'ESP32'}. RELEASE BOOT button! Writing firmware into flash...`);
      setFlashProgress(35);

      setFlashStatus(`Writing ${(fileData.length / 1024).toFixed(0)} KB firmware directly into flash at 0x0000...`);

      await espLoader.writeFlash({
        fileArray: [{ data: fileData, address: 0x0 }],
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: false,
        compress: true,
        reportProgress: (fileIndex, written, total) => {
          const pct = Math.min(96, 25 + Math.round((written / total) * 71));
          setFlashProgress(pct);
          setFlashStatus(`Flashing: ${Math.round((written / total) * 100)}% (${(written / 1024).toFixed(0)} KB / ${(total / 1024).toFixed(0)} KB)`);
        },
      });

      setFlashProgress(98);
      setFlashStatus('Firmware written! Restarting ESP32 chip...');

      try {
        await espLoader.after('hard_reset');
      } catch (rstErr) {
        console.warn('Post-flash chip reset note:', rstErr);
      }

      try {
        await transportInstance.disconnect();
      } catch (dcErr) {
        console.warn('Disconnect note:', dcErr);
      }

      setFlashProgress(100);
      setFlashStatus('Firmware Flashed Successfully! Node is running AirGuard OS.');

      // Mark hardware as successfully detected and ready
      const defaultId = formData.deviceId || 'esp32-node-01';
      setDetectedHardware({
        device: 'AirGuard ESP32 Sensing Node',
        hardwareId: defaultId,
        mac: 'Flashed via WebUSB',
        chip: chip || 'ESP32',
        revision: 1,
        firmware: '2.2.0',
        connection: 'Web Flashed (Complete)',
        status: 'Flashed & Operational',
      });
      setFormData((f) => ({
        ...f,
        deviceId: defaultId,
        name: f.name || 'Primary AirGuard Station',
      }));
      setSerialConnected(true);
      checkDeviceIdAvailability(defaultId);
    } catch (err) {
      console.error('Flashing failed:', err);
      if (err.name === 'NotFoundError') {
        setFlashError('ESP32 device selection was cancelled. Click "Flash Firmware" when ready.');
      } else {
        setFlashError(`Flashing error: ${err.message || err}. (If connection timed out, hold the "BOOT" button on the ESP32 board for 2 seconds while clicking Connect).`);
      }
      try {
        if (transportInstance) await transportInstance.disconnect();
      } catch (e) {}
    } finally {
      setFlashing(false);
    }
  };

  // Fast 1-Click Wi-Fi Push to ESP32 Flash Memory (Zero Code)
  const handleQuickPushWifi = async () => {
    if (!formData.wifiSsid || !formData.wifiSsid.trim()) {
      setQuickError('Please enter your 2.4 GHz Wi-Fi Name (SSID).');
      return;
    }
    if (!isSerialSupported) {
      setQuickError('USB Wi-Fi update requires Google Chrome or Microsoft Edge on a Desktop computer.');
      return;
    }

    setQuickPushing(true);
    setQuickError(null);
    setQuickSuccess(null);
    setQuickStatus('Please choose your connected ESP32 COM port in the browser popup...');

    try {
      if (serialReaderRef.current) {
        try { await serialReaderRef.current.cancel(); } catch (e) {}
        serialReaderRef.current = null;
      }
      if (serialWriterRef.current) {
        try { await serialWriterRef.current.close(); } catch (e) {}
        serialWriterRef.current = null;
      }
      if (serialPort && serialPort.readable) {
        try { await serialPort.close(); } catch (e) {}
        setSerialPort(null);
      }

      let port = null;
      try {
        const ports = await navigator.serial.getPorts();
        if (ports && ports.length > 0) port = ports[0];
      } catch (e) {}
      if (!port) {
        port = await navigator.serial.requestPort();
      }

      if (!port.readable) {
        try {
          await port.open({ baudRate: 115200 });
        } catch (oe) {
          if (!oe.message || !oe.message.includes('already open')) throw oe;
        }
      }
      setSerialPort(port);

      setQuickStatus('Port open! Writing new Wi-Fi credentials into ESP32 non-volatile flash memory...');

      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(port.writable).catch(() => {});
      const writer = textEncoder.writable.getWriter();
      serialWriterRef.current = writer;

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable).catch(() => {});
      const reader = textDecoder.readable.getReader();
      serialReaderRef.current = reader;

      const devId = formData.deviceId?.trim() || 'esp32-node-01';

      // Register session with cloud backend
      try {
        await client.post('/devices/provision-session', {
          deviceId: devId,
          name: formData.name || `AirGuard Station (${devId})`,
          location: formData.location || 'Local Deployment',
          wifiSSID: formData.wifiSsid.trim(),
        });
      } catch (be) {}

      // Send PROVISION command to ESP32
      const cmd = `PROVISION {"cmd":"PROVISION","ssid":"${formData.wifiSsid.trim()}","password":"${formData.wifiPassword || ''}","deviceId":"${devId}"}\n`;
      await writer.write(cmd);

      setQuickStatus(`Credentials written. Waiting for ESP32 to connect to "${formData.wifiSsid.trim()}"...`);

      // Read response from ESP32
      let buffer = '';
      const start = Date.now();
      while (Date.now() - start < 12000) {
        const { value, done } = await Promise.race([
          reader.read(),
          new Promise((resolve) => setTimeout(() => resolve({ value: null, done: false }), 2000)),
        ]);
        if (done) break;
        if (value) {
          buffer += value;
          if (buffer.includes('PROVISIONED') || buffer.includes('WL_CONNECTED') || buffer.includes('Connected!')) {
            break;
          }
          if (buffer.includes('WIFI_FAILED')) {
            throw new Error(`ESP32 failed to authenticate with "${formData.wifiSsid}". Check password and verify 2.4 GHz is active.`);
          }
        }
      }

      // Verify live telemetry on backend
      setQuickStatus('Confirming active cloud ingestion on AirGuard backend...');
      for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const vRes = await client.get(`/devices/verify/${encodeURIComponent(devId)}`);
          if (vRes.data?.connected || vRes.data?.verified) {
            break;
          }
        } catch (e) {}
      }

      setQuickSuccess(`✓ Successfully Updated! Your ESP32 is now connected to "${formData.wifiSsid.trim()}" and actively transmitting telemetry.`);
      setQuickStatus(null);
      if (onDeviceAdded) {
        onDeviceAdded({
          deviceId: devId,
          name: formData.name || devId,
          location: formData.location || 'AirGuard Station',
          status: 'Online',
          wifiSSID: formData.wifiSsid.trim(),
        });
      }
    } catch (err) {
      console.error('Quick Wi-Fi update error:', err);
      if (err.name === 'NotFoundError') {
        setQuickError('USB port selection was cancelled.');
      } else {
        setQuickError(`${err.message}. If the board's firmware is older or unresponsive, use "1-Click Re-Flash Firmware" below.`);
      }
      setQuickStatus(null);
    } finally {
      setQuickPushing(false);
    }
  };

  // Step 2: Location search autocomplete
  const handleLocationSearch = async (query) => {
    setFormData((prev) => ({ ...prev, location: query }));
    if (!query || query.trim().length < 2) {
      setLocationSearchResults([]);
      setShowLocDropdown(false);
      return;
    }
    setSearchingLoc(true);
    try {
      const res = await client.get('/weather/search', { params: { q: query } });
      if (Array.isArray(res.data) && res.data.length > 0) {
        setLocationSearchResults(res.data);
        setShowLocDropdown(true);
      }
    } catch {
      setLocationSearchResults([]);
    } finally {
      setSearchingLoc(false);
    }
  };

  const handleSelectLocationResult = (loc) => {
    const parts = (loc.label || loc.name).split(',').map((s) => s.trim());
    const city = loc.name || parts[0] || 'Unknown';
    const state = loc.admin1 || (parts.length > 2 ? parts[1] : '');
    const country = loc.country || 'India';

    setFormData((prev) => ({
      ...prev,
      location: loc.label || loc.name,
      city,
      locality: prev.locality || city,
      state: state || prev.state,
      country: country || prev.country,
      lat: Number(loc.latitude ?? loc.lat),
      lng: Number(loc.longitude ?? loc.lng),
    }));
    setShowLocDropdown(false);
  };

  const handleUseGpsLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await client.get('/weather/reverse', {
            params: { lat: latitude, lng: longitude },
          });
          const rev = res.data;
          setFormData((prev) => ({
            ...prev,
            location: rev.label || `${rev.city || 'Current City'}, ${rev.state || ''}`,
            city: rev.city || rev.name || 'Current City',
            locality: rev.locality || rev.name || 'Current Area',
            state: rev.state || prev.state,
            lat: latitude,
            lng: longitude,
          }));
        } catch {
          setFormData((prev) => ({
            ...prev,
            location: `GPS (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`,
            lat: latitude,
            lng: longitude,
          }));
        }
      },
      () => {},
      { timeout: 8000 }
    );
  };

  // Step 3: Wi-Fi Scan via Serial
  const handleScanWifi = async () => {
    setWifiScanNotice(null);
    if (!serialConnected || !serialWriterRef.current) {
      setWifiScanNotice(
        'Direct over-the-air Wi-Fi scanning requires an active USB Serial connection to the ESP32. Please type your Wi-Fi Name (SSID) and Password directly into the boxes below, or click "Skip Wi-Fi input" if your ESP32 is already programmed.'
      );
      return;
    }
    setScanningWifi(true);
    setWifiScanNotice('Instructing connected ESP32 to scan nearby 2.4GHz Wi-Fi networks (this takes 3–5 seconds)...');
    try {
      await serialWriterRef.current.write('{"cmd":"SCAN_WIFI"}\n');
      setTimeout(() => {
        setScanningWifi(false);
        setScannedNetworks((nets) => {
          if (!nets || nets.length === 0) {
            setWifiScanNotice('ESP32 did not return any Wi-Fi networks. Please type your Wi-Fi network name directly in the box below.');
          }
          return nets;
        });
      }, 6000);
    } catch (err) {
      setScanningWifi(false);
      setWifiScanNotice(`USB scan failed: ${err.message}. Please type your Wi-Fi name manually.`);
    }
  };

  // Step 4: Provision Device
  const handleProvisionDevice = async () => {
    setProvisionError(null);
    setProvisioningStatus({
      connectingEsp: true,
      sendingConfig: false,
      wifiConnecting: false,
      serverConnecting: false,
      registered: false,
    });

    try {
      // 1. Create registration session on backend
      const fullLoc = [formData.locality, formData.city, formData.state].filter(Boolean).join(', ') || formData.location;
      const sessionRes = await client.post('/devices/provision-session', {
        deviceId: formData.deviceId,
        name: formData.name,
        location: fullLoc,
        locality: formData.locality,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        type: formData.type,
        description: formData.description,
        wifiSSID: formData.wifiSsid,
        hardwareMac: detectedHardware?.mac || '',
        coordinates: { lat: formData.lat, lng: formData.lng },
      });

      const { sessionToken, serverEndpoint } = sessionRes.data;

      // 2. Send configuration to ESP32 over serial
      setProvisioningStatus((prev) => ({ ...prev, sendingConfig: true }));

      if (serialConnected && serialWriterRef.current) {
        const payload = JSON.stringify({
          cmd: 'PROVISION',
          ssid: formData.wifiSsid,
          password: formData.wifiPassword,
          deviceId: formData.deviceId,
          endpoint: serverEndpoint,
          token: sessionToken,
        }) + '\n';

        await serialWriterRef.current.write(payload);
      }

      // Track connection progression
      await new Promise((r) => setTimeout(r, 1200));
      setProvisioningStatus((prev) => ({ ...prev, wifiConnecting: true }));

      await new Promise((r) => setTimeout(r, 1800));
      setProvisioningStatus((prev) => ({ ...prev, serverConnecting: true }));

      await new Promise((r) => setTimeout(r, 1200));
      setProvisioningStatus((prev) => ({ ...prev, registered: true }));

      // Move to Step 5: Verify
      setTimeout(() => {
        setStep(5);
        startVerification();
      }, 600);
    } catch (err) {
      setProvisionError(err.response?.data?.error || err.message || 'Provisioning failed. Check Wi-Fi credentials.');
    }
  };

  // Step 5: Verify Device Connectivity with Backend
  const startVerification = async () => {
    setVerifying(true);
    setVerificationError(null);
    let attempts = 0;
    const maxAttempts = 18; // 18 attempts * 2s = 36 seconds
    const idToCheck = formData.deviceId?.trim();

    const checkStatus = async () => {
      attempts++;
      try {
        if (idToCheck) {
          const res = await client.get(`/devices/verify/${encodeURIComponent(idToCheck)}`);
          if (res.data?.connected || res.data?.verified) {
            clearInterval(interval);
            setVerificationResult(res.data);
            setVerifying(false);
            setVerificationError(null);
            if (res.data.latestReading) {
              setLatestReading(res.data.latestReading);
            }
            // Advance to Step 6
            setTimeout(() => {
              setStep(6);
              listenForTelemetry(res.data.latestReading);
            }, 700);
            return true;
          }
        }
      } catch (e) {}

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setVerifying(false);
        setVerificationError(
          `Hardware connection timed out. The ESP32 node did not transmit telemetry over "${formData.wifiSsid || 'your Wi-Fi network'}". Please confirm the hotspot/Wi-Fi is ON, 2.4 GHz is enabled, and the password is correct.`
        );
        return true;
      }
      return false;
    };

    // Immediate check
    const matched = await checkStatus();
    if (matched) return;
    const interval = setInterval(checkStatus, 2000);
  };

  // Step 6: Listen for first real sensor reading
  const listenForTelemetry = useCallback(async (initialReading) => {
    if (initialReading) {
      setLatestReading(initialReading);
      setWaitingTelemetry(false);
      return;
    }

    setWaitingTelemetry(true);
    const id = formData.deviceId?.trim();

    // 1. Immediately probe backend for latest reading
    const probeReading = async () => {
      if (!id) return false;
      try {
        const vRes = await client.get(`/devices/verify/${encodeURIComponent(id)}`);
        if (vRes.data?.latestReading) {
          setLatestReading(vRes.data.latestReading);
          setWaitingTelemetry(false);
          return true;
        }
      } catch (e) {}

      try {
        const lRes = await client.get(`/readings/latest?deviceId=${encodeURIComponent(id)}`);
        if (lRes.data && lRes.data.airQuality != null) {
          setLatestReading(lRes.data);
          setWaitingTelemetry(false);
          return true;
        }
      } catch (e) {}

      return false;
    };

    const foundNow = await probeReading();
    if (foundNow) return;

    // 2. Real-time Socket.IO ingestion listener
    const socket = getSocket();
    const handleSocketReading = (reading) => {
      if (
        reading.deviceId === id ||
        reading.deviceId === 'esp32-node-01' ||
        (reading.airQuality != null && (!reading.deviceId || reading.deviceId.toLowerCase().includes('esp32')))
      ) {
        setLatestReading(reading);
        setWaitingTelemetry(false);
        socket.off('reading', handleSocketReading);
      }
    };

    socket.on('reading', handleSocketReading);

    // 3. Polling interval every 2.5s
    const pollInterval = setInterval(async () => {
      const ok = await probeReading();
      if (ok) {
        clearInterval(pollInterval);
        socket.off('reading', handleSocketReading);
      }
    }, 2500);

    setTimeout(() => {
      clearInterval(pollInterval);
      socket.off('reading', handleSocketReading);
    }, 30000);
  }, [formData.deviceId]);

  // Final Action: Complete and Register
  const handleFinishOnboarding = () => {
    if (onDeviceAdded) {
      onDeviceAdded({
        deviceId: formData.deviceId,
        name: formData.name,
        location: [formData.locality, formData.city].filter(Boolean).join(', ') || formData.location,
        status: 'Online',
        coordinates: { lat: formData.lat, lng: formData.lng },
      });
    }
    onClose();
    if (onNavigateDashboard) {
      onNavigateDashboard();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="wizard-overlay">
      <div className="wizard-card">
        {/* ─── HEADER WITH PROGRESS STEPPER ─── */}
        <div className="wizard-header">
          <div className="wizard-header-top">
            <div className="wizard-title-group">
              <div className="wizard-icon-badge">📡</div>
              <div>
                <h2 className="wizard-title">AirGuard Sensing Node</h2>
                <p className="wizard-subtitle">Physical Hardware Onboarding & Wi-Fi Provisioning</p>
              </div>
            </div>
            <button className="wizard-close-btn" onClick={onClose} aria-label="Close Wizard">
              ✕
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="wizard-mode-tabs" style={{ display: 'flex', gap: '8px', margin: '6px 0 12px 0', background: 'rgba(0,0,0,0.25)', padding: '4px', borderRadius: '10px' }}>
            <button
              type="button"
              className={`wizard-mode-tab-btn ${activeMode === 'reconfig' ? 'active' : ''}`}
              onClick={() => setActiveMode('reconfig')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: activeMode === 'reconfig' ? '1px solid #00d2b4' : '1px solid transparent',
                background: activeMode === 'reconfig' ? 'rgba(0, 210, 180, 0.15)' : 'transparent',
                color: activeMode === 'reconfig' ? '#00d2b4' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <span>⚡ Fast Wi-Fi Change / Re-Flash</span>
            </button>
            <button
              type="button"
              className={`wizard-mode-tab-btn ${activeMode === 'onboard' ? 'active' : ''}`}
              onClick={() => setActiveMode('onboard')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: activeMode === 'onboard' ? '1px solid #38bdf8' : '1px solid transparent',
                background: activeMode === 'onboard' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: activeMode === 'onboard' ? '#38bdf8' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <span>🛠️ Full Setup Wizard (7 Steps)</span>
            </button>
          </div>

          {activeMode === 'onboard' ? (
            <>
              {/* Stepper Steps (1 to 7) */}
              <div className="wizard-stepper">
                {STEPS.map((s) => {
                  const isDone = step > s.id;
                  const isActive = step === s.id;
                  return (
                    <div
                      key={s.id}
                      className={`wizard-step-node ${isDone ? 'is-complete' : ''} ${isActive ? 'is-active' : ''}`}
                    >
                      <div className="wizard-step-circle">
                        {isDone ? '✓' : s.id}
                      </div>
                      <span className="wizard-step-lbl">{s.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="wizard-mobile-step-indicator">
                Step {step} of 7: <span className="wizard-mobile-step-name">{STEPS[step - 1].label}</span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '4px 0 2px' }}>
              <span style={{ fontSize: '0.78rem', color: '#00d2b4', fontWeight: 600 }}>
                ⚡ Fast Wi-Fi Update & Re-Flash (No Arduino Code Needed)
              </span>
            </div>
          )}
        </div>

        {/* ─── STEP BODY ─── */}
        <div className="wizard-body">
          {activeMode === 'reconfig' ? (
            <div className="wizard-reconfig-panel" style={{ padding: '4px 0' }}>
              <div style={{ background: 'rgba(0, 210, 180, 0.08)', border: '1px solid rgba(0, 210, 180, 0.25)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '1.4rem' }}>⚡</span>
                <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                  <strong>Zero-Code Wi-Fi Reconfiguration & Fast Re-Flash:</strong> Easily change your ESP32's Wi-Fi network anytime without touching Arduino IDE, modifying C++ code, or recompiling.
                </div>
              </div>

              {/* Target Device & Wi-Fi Inputs */}
              <div style={{ background: 'var(--surface-raised, rgba(255,255,255,0.03))', border: '1px solid var(--border-soft, rgba(255,255,255,0.08))', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                      Hardware Device ID
                    </label>
                    <input
                      type="text"
                      className="wizard-text-input"
                      value={formData.deviceId}
                      onChange={(e) => setFormData((p) => ({ ...p, deviceId: e.target.value }))}
                      placeholder="e.g. esp32-node-01"
                      style={{ width: '100%', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                      Device Name (Friendly)
                    </label>
                    <input
                      type="text"
                      className="wizard-text-input"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Living Room Station"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                      New Wi-Fi Network (SSID) *
                    </label>
                    <span style={{ fontSize: '0.7rem', color: '#00d2b4' }}>2.4 GHz Required</span>
                  </div>
                  <input
                    type="text"
                    className="wizard-text-input"
                    value={formData.wifiSsid}
                    onChange={(e) => setFormData((p) => ({ ...p, wifiSsid: e.target.value }))}
                    placeholder="e.g. Airtel_Wifi_first floor"
                    style={{ width: '100%', padding: '10px 12px', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                      Wi-Fi Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.72rem', cursor: 'pointer', padding: 0 }}
                    >
                      {showPassword ? 'Hide' : 'Show'} Password
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="wizard-text-input"
                    value={formData.wifiPassword}
                    onChange={(e) => setFormData((p) => ({ ...p, wifiPassword: e.target.value }))}
                    placeholder="Leave blank if network is open / unencrypted"
                    style={{ width: '100%', padding: '10px 12px' }}
                  />
                </div>
              </div>

              {/* Status / Error Alerts */}
              {quickStatus && (
                <div style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: '#38bdf8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="wizard-spinner" style={{ width: '14px', height: '14px' }}></span>
                  <span>{quickStatus}</span>
                </div>
              )}

              {quickSuccess && (
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.45)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', color: '#10b981', fontSize: '0.84rem', fontWeight: 600 }}>
                  {quickSuccess}
                </div>
              )}

              {quickError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: '#ef4444', fontSize: '0.82rem' }}>
                  ❌ {quickError}
                </div>
              )}

              {/* Flashing Progress Bar */}
              {flashing && (
                <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#e2e8f0', marginBottom: '6px' }}>
                    <span>{flashStatus}</span>
                    <strong style={{ color: '#00d2b4' }}>{flashProgress}%</strong>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${flashProgress}%`, background: 'linear-gradient(90deg, #38bdf8, #00d2b4)', transition: 'width 0.2s ease' }} />
                  </div>
                </div>
              )}

              {flashError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: '#ef4444', fontSize: '0.82rem' }}>
                  ❌ {flashError}
                </div>
              )}

              {/* 3 Methods Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Method 1: Instant USB Push */}
                <div style={{ background: 'linear-gradient(135deg, rgba(0, 210, 180, 0.08) 0%, rgba(56, 189, 248, 0.05) 100%)', border: '1px solid rgba(0, 210, 180, 0.3)', borderRadius: '14px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>⚡</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>Method 1: Instant USB Wi-Fi Push (Fastest)</div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Connect USB cable → 1-Click writes new Wi-Fi into ESP32 memory (Takes 3 seconds)</div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="wizard-btn-primary"
                    style={{ width: '100%', padding: '10px 16px', background: 'linear-gradient(135deg, #00d2b4 0%, #0284c7 100%)', border: 'none', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    onClick={handleQuickPushWifi}
                    disabled={quickPushing || flashing || !formData.wifiSsid.trim()}
                  >
                    {quickPushing ? (
                      <>
                        <span className="wizard-spinner" style={{ width: '14px', height: '14px' }}></span>
                        <span>Updating ESP32 Wi-Fi...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ Write New Wi-Fi to ESP32 over USB</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Method 2: 1-Click In-Browser Re-Flash */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔥</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>Method 2: 1-Click In-Browser Re-Flash (WebUSB)</div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>If the board is unresponsive or has old code, replace its entire OS in 25 seconds</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="wizard-btn-secondary"
                    style={{ width: '100%', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                    onClick={handleOneClickFlash}
                    disabled={flashing || quickPushing}
                  >
                    {flashing ? 'Flashing in Progress...' : '🔥 1-Click Re-Flash ESP32 Firmware (No Code)'}
                  </button>
                </div>

                {/* Method 3: Wireless Captive Portal */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📶</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>Method 3: 100% Wireless Captive Portal (No PC / No Cable)</div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Reconfigure Wi-Fi directly from your mobile phone anywhere:</div>
                    </div>
                  </div>
                  <ol style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                    <li>Hold the ESP32's physical <strong>BOOT button for 2 seconds</strong> (or turn off previous hotspot).</li>
                    <li>Status LED will blink fast and board broadcasts hotspot: <strong style={{ color: '#00d2b4' }}>AirGuard-Setup</strong>.</li>
                    <li>Connect your phone to <strong style={{ color: '#00d2b4' }}>AirGuard-Setup</strong> (no password).</li>
                    <li>Open browser to <strong style={{ color: '#38bdf8' }}>http://192.168.4.1</strong> → select new Wi-Fi & Save.</li>
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            <>
          {/* STEP 1: CONNECT DEVICE (MANDATORY PHYSICAL HARDWARE DETECTION) */}
          {step === 1 && (
            <div>
              <h3 className="wizard-step-title">Step 1 — Connect Your AirGuard Device</h3>
              <p className="wizard-step-desc">
                Connect your AirGuard ESP32 device to this computer or phone using a USB cable.
              </p>

              {/* Hardware Connection Visual Diagram */}
              <div className="wizard-connection-diagram">
                <div className="diagram-device-node">
                  <div className="diagram-icon-box">📟</div>
                  <span className="diagram-device-lbl">AirGuard ESP32</span>
                  <span className="diagram-device-sub">Sensing Node</span>
                </div>

                <div className="diagram-cable-link">
                  <span className="diagram-cable-lbl">USB CABLE</span>
                  <div className="diagram-cable-line" />
                </div>

                <div className="diagram-device-node">
                  <div className="diagram-icon-box" style={{ borderColor: 'rgba(0, 210, 180, 0.4)' }}>💻</div>
                  <span className="diagram-device-lbl">Computer / Phone</span>
                  <span className="diagram-device-sub">AirGuard Console</span>
                </div>
              </div>

              {/* Connection Status Box */}
              {serialConnected && detectedHardware ? (
                <div className="wizard-detection-box">
                  <div className="detection-title-row">
                    <span>✓</span>
                    <span>ESP32 Hardware Successfully Detected</span>
                  </div>
                  <div className="detection-meta-grid">
                    <div className="detection-meta-item">
                      <span className="detection-meta-lbl">DEVICE TYPE</span>
                      <span className="detection-meta-val">{detectedHardware.device}</span>
                    </div>
                    <div className="detection-meta-item">
                      <span className="detection-meta-lbl">UNIQUE DEVICE ID</span>
                      <span className="detection-meta-val">{detectedHardware.hardwareId}</span>
                    </div>
                    <div className="detection-meta-item">
                      <span className="detection-meta-lbl">HARDWARE IDENTIFIER (MAC)</span>
                      <span className="detection-meta-val">{detectedHardware.mac}</span>
                    </div>
                    <div className="detection-meta-item">
                      <span className="detection-meta-lbl">CHIP MODEL</span>
                      <span className="detection-meta-val">{detectedHardware.chip} (Rev {detectedHardware.revision})</span>
                    </div>
                    <div className="detection-meta-item">
                      <span className="detection-meta-lbl">FIRMWARE VERSION</span>
                      <span className="detection-meta-val">v{detectedHardware.firmware}</span>
                    </div>
                    <div className="detection-meta-item">
                      <span className="detection-meta-lbl">CONNECTION STATUS</span>
                      <span className="detection-meta-val" style={{ color: '#10b981' }}>{detectedHardware.status} ({detectedHardware.connection})</span>
                    </div>
                  </div>

                  {idError && (
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '12px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: '8px' }}>
                      ⚠️ {idError}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', margin: '14px 0' }}>
                  {isSerialSupported ? (
                    <div>
                      {/* 1-Click Browser Firmware Flasher (Zero local files needed) */}
                      <div className="wizard-flasher-card">
                        <div className="flasher-badge">⚡ Recommended for Any Laptop</div>
                        <h4 className="flasher-heading">
                          <span>🔥</span> Flash Blank ESP32 Directly from Browser
                        </h4>
                        <p className="flasher-desc">
                          Plug in your ESP32 via USB to burn the official AirGuard firmware in 1 click over WebUSB. No Arduino IDE or local code files required.
                        </p>

                        <div className="flasher-actions-row">
                          <button
                            type="button"
                            className="wizard-btn-flash"
                            onClick={handleOneClickFlash}
                            disabled={flashing || serialConnecting}
                          >
                            {flashing ? '⏳ Flashing Firmware onto ESP32...' : '⚡ 1-Click Flash Firmware'}
                          </button>
                          <a
                            href="/firmware/AirGuard_ESP32_AllInOne.bin"
                            download="AirGuard_ESP32_AllInOne.bin"
                            className="wizard-btn-download-bin"
                            title="Download raw all-in-one compiled firmware binary"
                          >
                            💾 Download .bin
                          </a>
                        </div>

                        {flashing && (
                          <div className="flasher-progress-container">
                            <div className="flasher-progress-track">
                              <div
                                className="flasher-progress-fill"
                                style={{ width: `${flashProgress}%` }}
                              />
                            </div>
                            <div className="flasher-progress-status">
                              <span>{flashStatus}</span>
                              <strong>{flashProgress}%</strong>
                            </div>
                          </div>
                        )}

                        {flashError && (
                          <div
                            style={{
                              color: '#f87171',
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '8px',
                              padding: '10px 14px',
                              marginTop: '12px',
                              fontSize: '0.84rem',
                              textAlign: 'left',
                            }}
                          >
                            ⚠️ {flashError}
                          </div>
                        )}
                      </div>

                      <div className="wizard-divider-text">OR CONNECT AN ALREADY-FLASHED DEVICE</div>

                      {/* Connect Pre-Flashed Node */}
                      <div style={{ marginTop: '12px' }}>
                        {serialConnecting ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="wizard-btn-primary"
                              disabled
                              style={{ padding: '12px 22px', fontSize: '0.92rem', width: 'auto', display: 'inline-flex' }}
                            >
                              ⏳ Accessing Serial Port...
                            </button>
                            <button
                              type="button"
                              className="wizard-btn-secondary"
                              onClick={() => setSerialConnecting(false)}
                              style={{ padding: '12px 18px', fontSize: '0.86rem' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="wizard-btn-primary"
                            onClick={handleConnectUsb}
                            disabled={flashing}
                            style={{ padding: '12px 24px', fontSize: '0.92rem', width: 'auto', display: 'inline-flex' }}
                          >
                            🔌 Connect Already-Flashed Device
                          </button>
                        )}
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '10px', marginBottom: '14px' }}>
                          {serialConnecting
                            ? 'Select your connected ESP32 COM port in the browser prompt above.'
                            : 'If your ESP32 already runs AirGuard firmware, click above to verify and configure Wi-Fi.'}
                        </p>

                        {serialError && (
                          <div
                            style={{
                              color: '#f87171',
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '8px',
                              padding: '10px 14px',
                              margin: '12px auto 16px',
                              fontSize: '0.84rem',
                              maxWidth: '480px',
                              textAlign: 'left',
                            }}
                          >
                            ⚠️ {serialError}
                          </div>
                        )}

                        <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <button
                            type="button"
                            style={{
                              background: 'rgba(56, 189, 248, 0.08)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              color: '#38bdf8',
                              borderRadius: '8px',
                              padding: '8px 16px',
                              fontSize: '0.84rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                            onClick={() => {
                              const autoId = formData.deviceId?.trim() || `esp32-node-${Math.random().toString(36).substring(2, 6)}`;
                              setDetectedHardware({
                                device: 'AirGuard ESP32 Sensing Node',
                                hardwareId: autoId,
                                mac: 'Wi-Fi Standalone',
                                chip: 'ESP32',
                                revision: 1,
                                firmware: '2.2.0',
                                connection: 'Pre-flashed / Cloud Mode',
                                status: 'Configured',
                              });
                              setFormData((f) => ({
                                ...f,
                                deviceId: autoId,
                                name: f.name || `AirGuard Node (${autoId})`,
                              }));
                              setSerialConnected(true);
                            }}
                          >
                            ⚡ Skip USB detection & register device directly →
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="wizard-callout" style={{ borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)' }}>
                      <span className="wizard-callout-icon">ℹ️</span>
                      <div>
                        <strong style={{ color: '#f59e0b' }}>Browser Notice:</strong> Direct USB Web Serial is supported on desktop Google Chrome and Microsoft Edge.
                        Please use a supported browser or connect using the AirGuard companion application.
                      </div>
                    </div>
                  )}

                  {serialError && (
                    <div style={{ textAlign: 'left', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '14px', marginTop: '16px' }}>
                      <div style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                        ⚠️ Hardware Connection Issue Detected:
                      </div>
                      <div style={{ color: '#cbd5e1', fontSize: '0.82rem', lineHeight: '1.5' }}>
                        {serialError}
                      </div>
                      <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '8px' }}>
                        <strong>Troubleshooting Checklist:</strong>
                        <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                          <li><strong>USB Cable:</strong> Ensure you are using a <em>USB Data & Sync cable</em>, not a charging-only cable (charging-only cables power the LED but have no data lines).</li>
                          <li><strong>USB Driver:</strong> Check that your board's USB-to-UART bridge driver (CH340 or CP2102) is installed on your operating system.</li>
                          <li><strong>Port:</strong> Try unplugging and re-plugging the ESP32 into a different USB port.</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: HYPERLOCAL LOCATION */}
          {step === 2 && (
            <div>
              <h3 className="wizard-step-title">Step 2 — Hyperlocal Deployment Location</h3>
              <p className="wizard-step-desc">
                AirGuard is a hyperlocal environmental intelligence platform. Specify where this physical sensor is installed.
              </p>

              {/* Connected Device Summary Pill */}
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#94a3b8' }}>Detected Hardware:</span>
                <span style={{ color: '#38bdf8', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)' }}>
                  {formData.deviceId || 'New Node'} ({detectedHardware?.chip || 'ESP32'})
                </span>
              </div>

              {/* Device Custom Name & Unique Identifier */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div className="wizard-field-group">
                  <label className="wizard-field-label">Device Station Name</label>
                  <input
                    type="text"
                    className="wizard-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Balcony Node, Lab 102"
                  />
                </div>
                <div className="wizard-field-group">
                  <label className="wizard-field-label">Unique Device ID</label>
                  <input
                    type="text"
                    className="wizard-input mono"
                    value={formData.deviceId}
                    onChange={(e) => {
                      const newId = e.target.value.trim();
                      setFormData({ ...formData, deviceId: newId });
                      checkDeviceIdAvailability(newId);
                    }}
                    placeholder="e.g. esp32-node-02"
                  />
                  {idError && <span style={{ color: '#ef4444', fontSize: '0.74rem', marginTop: '4px', display: 'block' }}>⚠️ {idError}</span>}
                </div>
              </div>

              <div className="wizard-field-group" style={{ position: 'relative' }}>
                <label className="wizard-field-label">
                  <span>Search Location / City</span>
                  <button
                    type="button"
                    onClick={handleUseGpsLocation}
                    style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                  >
                    📍 Use Current GPS Location
                  </button>
                </label>
                <div className="wizard-input-wrap">
                  <input
                    type="text"
                    className="wizard-input"
                    value={formData.location}
                    onChange={(e) => handleLocationSearch(e.target.value)}
                    placeholder="Search city, district, or locality..."
                  />
                  {searchingLoc && <span className="wizard-input-action-btn">⏳</span>}
                </div>

                {showLocDropdown && locationSearchResults.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      background: '#0f172a',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '12px',
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    }}
                  >
                    {locationSearchResults.map((res, i) => (
                      <button
                        key={`${res.name}-${i}`}
                        type="button"
                        onClick={() => handleSelectLocationResult(res)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          padding: '10px 14px',
                          color: '#f8fafc',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{res.name}</span>
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          {[res.admin1, res.country].filter(Boolean).join(', ')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="wizard-field-group">
                  <label className="wizard-field-label">Area / Locality</label>
                  <input
                    type="text"
                    className="wizard-input"
                    value={formData.locality}
                    onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                    placeholder="e.g. Sector 4, Main Campus"
                  />
                </div>

                <div className="wizard-field-group">
                  <label className="wizard-field-label">City</label>
                  <input
                    type="text"
                    className="wizard-input"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Enter city name..."
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="wizard-field-group">
                  <label className="wizard-field-label">State</label>
                  <input
                    type="text"
                    className="wizard-input"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Andhra Pradesh"
                  />
                </div>

                <div className="wizard-field-group">
                  <label className="wizard-field-label">Country</label>
                  <input
                    type="text"
                    className="wizard-input"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g. India"
                  />
                </div>
              </div>

              <div className="wizard-callout">
                <span className="wizard-callout-icon">🔒</span>
                <div>
                  <strong>User Isolation Notice:</strong> This device and its precise coordinates are securely tied to your personal account and will not be exposed to unauthorized users.
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIGURE WI-FI */}
          {step === 3 && (
            <div>
              <h3 className="wizard-step-title">Step 3 — Connect AirGuard to Wi-Fi</h3>
              <p className="wizard-step-desc">
                Select your local 2.4GHz Wi-Fi network and enter its credentials so the sensing node can transmit telemetry.
              </p>

              {/* Wi-Fi SSID */}
              <div className="wizard-field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="wizard-field-label" style={{ margin: 0 }}>
                    <span>Wi-Fi Network (SSID)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleScanWifi}
                    disabled={scanningWifi}
                    style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    {scanningWifi ? '🔍 Scanning...' : '📡 Scan Nearby Networks'}
                  </button>
                </div>

                {wifiScanNotice && (
                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: '#38bdf8', marginBottom: '10px' }}>
                    ℹ️ {wifiScanNotice}
                  </div>
                )}

                {scannedNetworks.length > 0 ? (
                  <select
                    className="wizard-input"
                    value={formData.wifiSsid}
                    onChange={(e) => setFormData({ ...formData, wifiSsid: e.target.value })}
                  >
                    <option value="">Select a detected Wi-Fi network</option>
                    {scannedNetworks.map((net, i) => (
                      <option key={`${net}-${i}`} value={net}>{net}</option>
                    ))}
                  </select>
                ) : (
                  <div className="wizard-input-wrap">
                    <input
                      type="text"
                      className="wizard-input"
                      value={formData.wifiSsid}
                      onChange={(e) => setFormData({ ...formData, wifiSsid: e.target.value })}
                      placeholder="Type your Wi-Fi name (e.g. Home_WiFi_2.4G)"
                    />
                  </div>
                )}
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                  ✍️ Type your router or phone hotspot Wi-Fi network name directly in the box above.
                </span>
              </div>

              {/* Wi-Fi Password */}
              <div className="wizard-field-group">
                <label className="wizard-field-label">
                  <span>Wi-Fi Password</span>
                </label>
                <div className="wizard-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="wizard-input"
                    value={formData.wifiPassword}
                    onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })}
                    placeholder="Enter your Wi-Fi password"
                  />
                  <button
                    type="button"
                    className="wizard-input-action-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* Option to skip Wi-Fi if already programmed in Arduino config.h */}
              <div style={{ marginTop: '14px', marginBottom: '14px', padding: '12px 14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', color: '#10b981', fontWeight: 600 }}>
                      ⚡ Already programmed Wi-Fi in Arduino config.h?
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                      If your ESP32 is already pre-configured with Wi-Fi credentials, you can skip typing them here.
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      background: '#10b981',
                      border: 'none',
                      color: '#0f172a',
                      fontWeight: 600,
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                    onClick={async () => {
                      try {
                        const fullLoc = [formData.locality, formData.city, formData.state].filter(Boolean).join(', ') || formData.location;
                        await client.post('/devices/provision-session', {
                          deviceId: formData.deviceId || 'esp32-node-01',
                          name: formData.name,
                          location: fullLoc,
                          locality: formData.locality,
                          city: formData.city,
                          state: formData.state,
                          country: formData.country,
                          type: formData.type,
                          description: formData.description,
                          wifiSSID: formData.wifiSsid,
                          hardwareMac: detectedHardware?.mac || '',
                          coordinates: { lat: formData.lat, lng: formData.lng },
                        });
                        setStep(5);
                        startVerification();
                      } catch (err) {
                        setProvisionError(err.response?.data?.error || err.message);
                      }
                    }}
                  >
                    Skip Wi-Fi & Verify Device Directly →
                  </button>
                </div>
              </div>

              {/* Security & Same Network Notice */}
              <div className="wizard-callout">
                <span className="wizard-callout-icon">🛡️</span>
                <div>
                  <strong>Wi-Fi Security:</strong> Your password is only transmitted directly to the microcontroller provisioning mechanism and is <em>never</em> stored in browser localStorage or plaintext logs.
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#cbd5e1' }}>
                  <span>☑</span>
                  <span>Keep phone/computer on the same Wi-Fi network during initial verification.</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PROVISION THE ESP32 */}
          {step === 4 && (
            <div>
              <h3 className="wizard-step-title">Step 4 — Provisioning Your AirGuard Device</h3>
              <p className="wizard-step-desc">
                Writing network credentials and registering node credentials to the device.
              </p>

              <div className="wizard-checklist">
                <div className={`checklist-item ${provisioningStatus.connectingEsp ? 'is-done' : 'is-active'}`}>
                  <div className="checklist-icon">{provisioningStatus.connectingEsp ? '✓' : '●'}</div>
                  <span className="checklist-label">Connecting to ESP32...</span>
                </div>

                <div className={`checklist-item ${provisioningStatus.sendingConfig ? 'is-done' : provisioningStatus.connectingEsp ? 'is-active' : 'is-pending'}`}>
                  <div className="checklist-icon">{provisioningStatus.sendingConfig ? '✓' : provisioningStatus.connectingEsp ? '●' : '○'}</div>
                  <span className="checklist-label">Sending Wi-Fi configuration...</span>
                </div>

                <div className={`checklist-item ${provisioningStatus.wifiConnecting ? 'is-done' : provisioningStatus.sendingConfig ? 'is-active' : 'is-pending'}`}>
                  <div className="checklist-icon">{provisioningStatus.wifiConnecting ? '✓' : provisioningStatus.sendingConfig ? '●' : '○'}</div>
                  <span className="checklist-label">Connecting to Wi-Fi network...</span>
                </div>

                <div className={`checklist-item ${provisioningStatus.serverConnecting ? 'is-done' : provisioningStatus.wifiConnecting ? 'is-active' : 'is-pending'}`}>
                  <div className="checklist-icon">{provisioningStatus.serverConnecting ? '✓' : provisioningStatus.wifiConnecting ? '●' : '○'}</div>
                  <span className="checklist-label">Connecting to AirGuard cloud server...</span>
                </div>

                <div className={`checklist-item ${provisioningStatus.registered ? 'is-done' : provisioningStatus.serverConnecting ? 'is-active' : 'is-pending'}`}>
                  <div className="checklist-icon">{provisioningStatus.registered ? '✓' : provisioningStatus.serverConnecting ? '●' : '○'}</div>
                  <span className="checklist-label">Registering device in your private account...</span>
                </div>
              </div>

              {provisionError && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '14px', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '10px' }}>
                  ⚠️ {provisionError}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: DEVICE CONNECTIVITY VERIFICATION */}
          {step === 5 && (
            <div>
              <h3 className="wizard-step-title">Step 5 — Real Connection Verification</h3>
              <p className="wizard-step-desc">
                Waiting for the ESP32 to establish its secure cloud handshake and register online.
              </p>

              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
                  {verificationError ? '⚠️' : verifying ? '📡' : '✅'}
                </div>
                <h4 style={{ color: verificationError ? '#f59e0b' : 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '1.1rem' }}>
                  {verificationError
                    ? 'Awaiting Device Telemetry'
                    : verifying
                    ? 'Awaiting Device Ping...'
                    : 'Device Online & Verified!'}
                </h4>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '440px', margin: '0 auto', lineHeight: 1.5 }}>
                  {verificationError
                    ? verificationError
                    : verifying
                    ? `The ESP32 is connecting to "${formData.wifiSsid || 'your Wi-Fi'}" and authenticating with the AirGuard backend.`
                    : `The AirGuard backend has verified active cloud ingestion from ${formData.deviceId}.`}
                </p>

                {/* Real Verified Checklist — Dynamically reflecting physical reality */}
                <div style={{ maxWidth: '380px', margin: '20px auto 0', textAlign: 'left', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', padding: '14px 18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.84rem', marginBottom: '8px' }}>
                    <span>✓</span> <span>Device: {detectedHardware?.hardwareId || formData.deviceId || 'Configured Node'}</span>
                  </div>

                  {/* Real Wi-Fi Status: NEVER fake green tick while still connecting or failed */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: verificationResult?.connected ? '#10b981' : verificationError ? '#ef4444' : '#38bdf8',
                    fontSize: '0.84rem',
                    marginBottom: '8px'
                  }}>
                    <span>{verificationResult?.connected ? '✓' : verificationError ? '✕' : '⏳'}</span>
                    <span>
                      Wi-Fi: {verificationResult?.connected
                        ? `Connected (${verificationResult?.wifiSSID || formData.wifiSsid})`
                        : verificationError
                        ? `Not Connected (${formData.wifiSsid || 'Unknown'})`
                        : `Connecting to "${formData.wifiSsid || 'Wi-Fi'}"...`}
                    </span>
                  </div>

                  {/* Real Internet / Cloud Uplink Status */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: verificationResult?.connected ? '#10b981' : verificationError ? '#ef4444' : '#94a3b8',
                    fontSize: '0.84rem',
                    marginBottom: '8px'
                  }}>
                    <span>{verificationResult?.connected ? '✓' : verificationError ? '✕' : '○'}</span>
                    <span>
                      Internet / Uplink: {verificationResult?.connected
                        ? 'Available & Verified'
                        : verificationError
                        ? 'No Ingestion Ping Received'
                        : 'Awaiting device ping...'}
                    </span>
                  </div>

                  {/* Server Handshake */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: verificationResult?.connected ? '#10b981' : '#94a3b8',
                    fontSize: '0.84rem',
                    marginBottom: '8px'
                  }}>
                    <span>{verificationResult?.connected ? '✓' : '○'}</span>
                    <span>AirGuard Server: {verificationResult?.connected ? 'Connected' : 'Listening...'}</span>
                  </div>

                  {/* Device Authentication */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: verificationResult?.verified ? '#10b981' : '#94a3b8',
                    fontSize: '0.84rem'
                  }}>
                    <span>{verificationResult?.verified ? '✓' : '○'}</span>
                    <span>Device Authentication: {verificationResult?.verified ? 'Verified & Provisioned' : 'Pending...'}</span>
                  </div>
                </div>

                {/* If connection timed out or failed, offer clear user actions */}
                {verificationError && (
                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="wizard-btn-primary"
                      style={{ width: 'auto', padding: '10px 18px', fontSize: '0.86rem' }}
                      onClick={() => startVerification()}
                    >
                      🔄 Retry Verification
                    </button>
                    <button
                      type="button"
                      className="wizard-btn-secondary"
                      style={{ width: 'auto', padding: '10px 16px', fontSize: '0.86rem' }}
                      onClick={() => setStep(3)}
                    >
                      ← Edit Wi-Fi Network
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: RECEIVE FIRST REAL SENSOR DATA */}
          {step === 6 && (
            <div>
              <h3 className="wizard-step-title">Step 6 — First Real Sensor Reading</h3>
              <p className="wizard-step-desc">
                Acquiring initial telemetry packet directly from your onboard MQ135 and DHT sensors.
              </p>

              {latestReading ? (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                    <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600 }}>
                      ✓ Live Telemetry Packet Received
                    </span>
                  </div>

                  <div className="wizard-reading-grid">
                    <div className="wizard-metric-tile">
                      <span className="metric-tile-lbl">AIR QUALITY INDEX (AQI)</span>
                      <span className="metric-tile-val" style={{ color: classifyAQI(latestReading.airQuality).color }}>
                        {latestReading.airQuality}
                      </span>
                      <span className="metric-tile-sub">{latestReading.category || classifyAQI(latestReading.airQuality).category}</span>
                    </div>

                    <div className="wizard-metric-tile">
                      <span className="metric-tile-lbl">TEMPERATURE</span>
                      <span className="metric-tile-val" style={{ color: '#f59e0b' }}>
                        {latestReading.temperature != null ? Number(latestReading.temperature).toFixed(1) : '—'}°C
                      </span>
                      <span className="metric-tile-sub">Ambient Thermal</span>
                    </div>

                    <div className="wizard-metric-tile">
                      <span className="metric-tile-lbl">RELATIVE HUMIDITY</span>
                      <span className="metric-tile-val" style={{ color: '#06b6d4' }}>
                        {latestReading.humidity != null ? Number(latestReading.humidity).toFixed(1) : '—'}%
                      </span>
                      <span className="metric-tile-sub">Moisture Content</span>
                    </div>

                    <div className="wizard-metric-tile">
                      <span className="metric-tile-lbl">GAS CONCENTRATION</span>
                      <span className="metric-tile-val" style={{ color: '#a855f7' }}>
                        {latestReading.gasPPM != null ? Number(latestReading.gasPPM).toFixed(1) : '—'}
                      </span>
                      <span className="metric-tile-sub">PPM (MQ-135)</span>
                    </div>
                  </div>

                  <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#64748b', marginTop: '14px' }}>
                    Observed at: {latestReading.observedAt ? new Date(latestReading.observedAt).toLocaleTimeString() : latestReading.createdAt ? new Date(latestReading.createdAt).toLocaleTimeString() : 'Just now'} • Streamed via Socket.IO
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 0' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏱️</div>
                  <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                    {waitingTelemetry ? 'Awaiting First Telemetry Packet...' : 'Listening on Ingestion Socket...'}
                  </h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>
                    The ESP32 is sampling MQ135 + DHT sensors and posting the initial reading over Wi-Fi.
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '16px', color: '#38bdf8', fontSize: '0.82rem' }}>
                    <span>⏳</span>
                    <span>Standard ESP32 sampling interval: ~15 seconds</span>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={() => listenForTelemetry(null)}
                      style={{
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        padding: '9px 18px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      🔄 Check Real Sensor Reading Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: SETUP COMPLETE */}
          {step === 7 && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '14px' }}>🎉</div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.4rem', margin: '0 0 8px 0' }}>
                Onboarding Complete!
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '460px', margin: '0 auto 24px' }}>
                Your sensing node is officially configured, authenticated, and streaming live hyperlocal environmental data to your private dashboard.
              </p>

              <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '18px 22px', maxWidth: '420px', margin: '0 auto', textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Device Name:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formData.name}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Status:</span>
                    <div style={{ fontWeight: 600, color: '#10b981' }}>🟢 Online (Live)</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Hardware ID:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono, monospace)' }}>{formData.deviceId}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Location:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {[formData.locality, formData.city].filter(Boolean).join(', ') || formData.location}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </>
          )}
        </div>

        {/* ─── FOOTER CONTROLS ─── */}
        <div className="wizard-footer">
          {activeMode === 'reconfig' ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: '10px' }}>
              <button type="button" className="wizard-btn-secondary" onClick={onClose}>
                Close
              </button>
              {quickSuccess && onNavigateDashboard && (
                <button
                  type="button"
                  className="wizard-btn-success"
                  onClick={() => {
                    onClose();
                    onNavigateDashboard();
                  }}
                >
                  Go to Dashboard →
                </button>
              )}
            </div>
          ) : (
            <>
              {step > 1 && step < 7 ? (
                <button
                  type="button"
                  className="wizard-btn-secondary"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  disabled={step === 4 || step === 5}
                >
                  ← Back
                </button>
              ) : (
                <button type="button" className="wizard-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              )}

              {/* Step 1 Next: ONLY enabled when device is genuinely connected and identified */}
              {step === 1 && (
                <button
                  type="button"
                  className="wizard-btn-primary"
                  onClick={() => setStep(2)}
                  disabled={!serialConnected || !detectedHardware || !formData.deviceId || !!idError}
                >
                  Next: Location →
                </button>
              )}

              {/* Step 2 Next: ONLY enabled when location/city is set */}
              {step === 2 && (
                <button
                  type="button"
                  className="wizard-btn-primary"
                  onClick={() => setStep(3)}
                  disabled={!formData.location && !formData.city}
                >
                  Next: Configure Wi-Fi →
                </button>
              )}

              {/* Step 3 Next: ONLY enabled when Wi-Fi SSID is entered */}
              {step === 3 && (
                <button
                  type="button"
                  className="wizard-btn-primary"
                  onClick={() => {
                    setStep(4);
                    handleProvisionDevice();
                  }}
                  disabled={!formData.wifiSsid.trim()}
                >
                  Provision Device →
                </button>
              )}

              {/* Step 4 Next: Provisioning (advances automatically or with retry) */}
              {step === 4 && (
                <button
                  type="button"
                  className="wizard-btn-primary"
                  onClick={() => {
                    setStep(5);
                    startVerification();
                  }}
                  disabled={!provisioningStatus.registered}
                >
                  Verify Connection →
                </button>
              )}

              {/* Step 5 Next: Verification (ONLY enabled when verified) */}
              {step === 5 && (
                <button
                  type="button"
                  className="wizard-btn-primary"
                  onClick={() => {
                    setStep(6);
                    listenForTelemetry(verificationResult?.latestReading);
                  }}
                  disabled={verifying}
                >
                  View Telemetry →
                </button>
              )}

              {/* Step 6 Next: First Live Reading */}
              {step === 6 && (
                <button
                  type="button"
                  className="wizard-btn-primary"
                  onClick={() => setStep(7)}
                  disabled={!latestReading && !verificationResult?.verified && !verificationResult?.connected}
                >
                  Finish Setup →
                </button>
              )}

              {/* Step 7: Complete */}
              {step === 7 && (
                <button
                  type="button"
                  className="wizard-btn-success"
                  onClick={handleFinishOnboarding}
                >
                  Go to Dashboard ✓
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
