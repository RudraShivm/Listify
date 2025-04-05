import 'package:flutter/material.dart';

import '../services/database_services.dart';

class ThemeProvider with ChangeNotifier {
  late ThemeMode _themeMode;
  final DatabaseServices _databaseServices = DatabaseServices.instance;

  ThemeProvider(ThemeMode themeMode) {
    _themeMode = themeMode;
    notifyListeners();
  }

  ThemeMode get themeMode => _themeMode;

  void setTheme(ThemeMode newThemeMode) {
    _themeMode = newThemeMode;
    _databaseServices.updateThemeMode(newThemeMode);
    notifyListeners();
  }
}
