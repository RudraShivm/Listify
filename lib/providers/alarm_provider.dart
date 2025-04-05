import 'package:listify/models/alarm_sound.dart';
import 'package:flutter/material.dart';
import '../services/database_services.dart';

class AlarmProvider with ChangeNotifier {
  late AlarmSound _alarmSound;
  final DatabaseServices _databaseServices = DatabaseServices.instance;

  AlarmProvider(AlarmSound alarmSound) {
    _alarmSound = alarmSound;
    notifyListeners();
  }

  AlarmSound get alarmSound => _alarmSound;

  void setAlarmSound(AlarmSound newAlarmSound) {
    _alarmSound = newAlarmSound;
    _databaseServices.updateAlarmSound(newAlarmSound);
    notifyListeners();
  }
}
