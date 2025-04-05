import 'package:flutter/material.dart';

ThemeData lightTheme = ThemeData(
  colorScheme: ColorScheme.fromSeed(
    seedColor: Color.fromRGBO(255, 189, 132, 0.7),
  ),
  useMaterial3: true,
  appBarTheme: AppBarTheme(color: Color.fromRGBO(255, 189, 132, 0.7)),
  expansionTileTheme: ExpansionTileThemeData(
    backgroundColor: Color.fromRGBO(246, 240, 234, 1),
    collapsedBackgroundColor: Color.fromRGBO(255, 248, 245, 1),
  ),
);
ThemeData darkTheme = ThemeData(
  colorScheme: ColorScheme.dark(
    primary: Color.fromRGBO(146, 190, 240, 1),
    secondary: Color.fromRGBO(57, 137, 230, 0.5),
  ),
  useMaterial3: true,
  appBarTheme: AppBarTheme(color: Color.fromRGBO(24, 25, 30, 1)),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: Color.fromRGBO(30, 73, 118, 1),
    ),
  ),
  expansionTileTheme: ExpansionTileThemeData(
    backgroundColor: Color.fromRGBO(31, 31, 31, 1),
    collapsedBackgroundColor: Color.fromRGBO(21, 21, 21, 1),
  ),
);
