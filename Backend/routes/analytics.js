const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');
const { Device } = require('../models/Device');
const { optionalAuth } = require('../middleware/auth');

// GET /api/analytics
router.get('/', optionalAuth, async (req, res, next) => {
    try {
        const { deviceId, from, to } = req.query;

        const matchStage = {};
        if (deviceId && deviceId !== 'all') {
            matchStage.deviceId = deviceId.trim();
        } else if (req.user && req.user.role !== 'admin') {
            const userDevices = await Device.find({ $or: [{ userId: req.user._id }, { userId: null }] }).select('deviceId');
            if (userDevices.length > 0) {
                matchStage.deviceId = { $in: userDevices.map((d) => d.deviceId) };
            }
        }

        if (from || to) {
            matchStage.createdAt = {};
            if (from) matchStage.createdAt.$gte = new Date(from);
            if (to) matchStage.createdAt.$lte = new Date(to);
        }

        let activeMatch = { ...matchStage };
        let isStandby = false;
        let lastSeenDate = null;

        // 1. Overall statistical aggregations
        let [stats] = await Reading.aggregate([
            { $match: activeMatch },
            {
                $group: {
                    _id: null,
                    minAQI: { $min: '$airQuality' },
                    maxAQI: { $max: '$airQuality' },
                    avgAQI: { $avg: '$airQuality' },
                    avgTemp: { $avg: '$temperature' },
                    avgHumidity: { $avg: '$humidity' },
                    avgGasPPM: { $avg: '$gasPPM' },
                    totalSamples: { $sum: 1 },
                },
            },
        ]);

        // If no records in the strict wall-clock window (e.g. device is offline / standby):
        if (!stats || stats.totalSamples === 0) {
            const baseFilter = {};
            if (activeMatch.deviceId) baseFilter.deviceId = activeMatch.deviceId;
            const latestDoc = await Reading.findOne(baseFilter).sort({ createdAt: -1 });

            if (latestDoc) {
                isStandby = true;
                lastSeenDate = latestDoc.createdAt;

                // Anchor the observation window to the latest recorded operational telemetry session
                if (from && to) {
                    const diffMs = Math.max(24 * 60 * 60 * 1000, new Date(to).getTime() - new Date(from).getTime());
                    activeMatch.createdAt = {
                        $gte: new Date(new Date(latestDoc.createdAt).getTime() - diffMs),
                        $lte: new Date(latestDoc.createdAt),
                    };
                } else if (from) {
                    const diffMs = Math.max(24 * 60 * 60 * 1000, Date.now() - new Date(from).getTime());
                    activeMatch.createdAt = {
                        $gte: new Date(new Date(latestDoc.createdAt).getTime() - diffMs),
                    };
                } else {
                    delete activeMatch.createdAt;
                }

                const [standbyStats] = await Reading.aggregate([
                    { $match: activeMatch },
                    {
                        $group: {
                            _id: null,
                            minAQI: { $min: '$airQuality' },
                            maxAQI: { $max: '$airQuality' },
                            avgAQI: { $avg: '$airQuality' },
                            avgTemp: { $avg: '$temperature' },
                            avgHumidity: { $avg: '$humidity' },
                            avgGasPPM: { $avg: '$gasPPM' },
                            totalSamples: { $sum: 1 },
                        },
                    },
                ]);
                if (standbyStats) {
                    stats = standbyStats;
                }
            }
        }

        // 2. Category distribution
        const categoryDistribution = await Reading.aggregate([
            { $match: activeMatch },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        // 3. Hourly diurnal aggregation
        const hourlyTrends = await Reading.aggregate([
            { $match: activeMatch },
            {
                $group: {
                    _id: {
                        hour: { $hour: '$createdAt' },
                    },
                    avgAQI: { $avg: '$airQuality' },
                    avgTemp: { $avg: '$temperature' },
                    sampleCount: { $sum: 1 },
                },
            },
            { $sort: { '_id.hour': 1 } },
        ]);

        res.json({
            isStandby,
            lastSeenDate,
            summary: {
                minAQI: stats ? Math.round(stats.minAQI) : 0,
                maxAQI: stats ? Math.round(stats.maxAQI) : 0,
                avgAQI: stats ? Math.round(stats.avgAQI) : 0,
                avgTemp: stats ? Number(stats.avgTemp.toFixed(1)) : 0,
                avgHumidity: stats ? Math.round(stats.avgHumidity) : 0,
                avgGasPPM: stats ? Math.round(stats.avgGasPPM) : 0,
                totalSamples: stats ? stats.totalSamples : 0,
            },
            categoryDistribution: categoryDistribution.map((c) => ({
                category: c._id,
                count: c.count,
            })),
            hourlyTrends: hourlyTrends.map((h) => ({
                hour: h._id.hour,
                avgAQI: Math.round(h.avgAQI),
                avgTemp: Number(h.avgTemp.toFixed(1)),
                sampleCount: h.sampleCount,
            })),
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
