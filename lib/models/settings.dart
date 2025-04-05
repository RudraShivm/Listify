import 'package:demo_proj_2/models/alarm_sound.dart';
import 'package:flutter/material.dart';

class Settings {
  ThemeMode themeMode;
  AlarmSound alarmSound;

  Settings({this.themeMode = ThemeMode.light, required this.alarmSound});
}
