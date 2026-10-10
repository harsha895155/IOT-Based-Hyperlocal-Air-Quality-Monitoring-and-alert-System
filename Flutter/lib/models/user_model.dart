class UserPreferences {
  final bool emailAlerts;
  final bool pushAlerts;
  final bool soundAlerts;
  final String theme;
  final String tempUnit;
  final int refreshRate;
  final String defaultStation;

  UserPreferences({
    this.emailAlerts = true,
    this.pushAlerts = true,
    this.soundAlerts = true,
    this.theme = 'obsidian',
    this.tempUnit = 'C',
    this.refreshRate = 15,
    this.defaultStation = 'AIRGUARD-001',
  });

  factory UserPreferences.fromJson(Map<String, dynamic>? json) {
    if (json == null) return UserPreferences();
    return UserPreferences(
      emailAlerts: json['emailAlerts'] ?? true,
      pushAlerts: json['pushAlerts'] ?? true,
      soundAlerts: json['soundAlerts'] ?? true,
      theme: json['theme'] ?? 'obsidian',
      tempUnit: json['tempUnit'] ?? 'C',
      refreshRate: (json['refreshRate'] as num?)?.toInt() ?? 15,
      defaultStation: json['defaultStation'] ?? 'AIRGUARD-001',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'emailAlerts': emailAlerts,
      'pushAlerts': pushAlerts,
      'soundAlerts': soundAlerts,
      'theme': theme,
      'tempUnit': tempUnit,
      'refreshRate': refreshRate,
      'defaultStation': defaultStation,
    };
  }
}

class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final UserPreferences preferences;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.preferences,
  });

  bool get isAdmin => role == 'admin';
  bool get isResearcher => role == 'researcher';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'user',
      preferences: UserPreferences.fromJson(json['preferences']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'preferences': preferences.toJson(),
    };
  }
}
