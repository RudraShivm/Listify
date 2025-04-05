import 'package:demo_proj_2/models/alarm_sound.dart';
import 'package:demo_proj_2/models/settings.dart';
import 'package:demo_proj_2/models/task.dart';
import 'package:flutter/material.dart';

// Removed unused import
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

class SettingsProps {
  SettingsProps._();

  static final themeMode = 'themeMode';
  static final alarmSoundName = 'alarmSoundName';
  static final alarmSoundLocation = 'alarmSoundLocation';
}

class DatabaseServices {
  static final DatabaseServices instance = DatabaseServices._constructor();
  static Database? _db;

  final String _todoTableName = 'todo';
  final String _idColumn = 'id';
  final String _titleColumn = 'title';
  final String _contentColumn = 'content';
  final String _statusColumn = 'status';
  final String _dateColumn = 'date';
  final String _predecessorColumn = 'predecessor';
  final String _successorColumn = 'successor';

  final String _settingsTableName = 'settings';
  final String _propertyColumn = 'property';
  final String _valueColumn = 'value';

  DatabaseServices._constructor();

  Future<Database> get database async {
    if (_db != null) {
      return _db!; // The ! tells Dart: "I know _db is not null, trust me!"
    }
    _db = await getDatabase();
    return _db!;
  }

  /*
   whenever your function performs an asynchronous operation. This allows your function to return a promise that will complete at some point in the future rather than blocking execution.
   */

  Future<Database> getDatabase() async {
    final databaseDir = await getDatabasesPath();
    final databasePath = join(databaseDir, 'todoDB.db');

    final database = await openDatabase(
      databasePath,
      version: 1,
      onCreate: (db, version) async {
        // No need for db.transaction here, as onCreate already handles that
        await db.execute(''' 
        CREATE TABLE $_todoTableName(
          $_idColumn INTEGER PRIMARY KEY,
          $_titleColumn TEXT NOT NULL,
          $_contentColumn TEXT NOT NULL,
          $_statusColumn INT NOT NULL,
          $_dateColumn INT,
          $_predecessorColumn INT,
          $_successorColumn INT
        );
      ''');

        // Create Settings table
        await db.execute(''' 
        CREATE TABLE $_settingsTableName(
          $_propertyColumn TEXT PRIMARY KEY,
          $_valueColumn TEXT NOT NULL
        );
      ''');
      },
    );
    return database;
  }

  Future<int> addTask(Task task) async {
    Database db = await database;
    return await db.rawInsert(
      '''
      INSERT INTO $_todoTableName($_titleColumn , $_contentColumn, $_statusColumn, $_dateColumn, $_predecessorColumn, $_successorColumn) VALUES ( ?, ?, ?, ?, ?, ?)
      ''',
      [
        task.title,
        task.content,
        task.status,
        task.date?.millisecondsSinceEpoch,
        task.predecessor,
        task.successor,
      ],
    );
  }

  Future<List<Task>> getTasks() async {
    Database db = await database;
    List<Map<String, Object?>> tasksMap = await db.rawQuery('''
      SELECT * FROM $_todoTableName
    ''');
    List<Task> tasksArr =
        tasksMap
            .map(
              (e) => Task(
                id: e['id'] as int,
                title: e['title'] as String,
                content: e['content'] as String,
                status: e['status'] as int,
                date:
                    e['date'] == null
                        ? null
                        : DateTime.fromMillisecondsSinceEpoch(e['date'] as int),
                predecessor:
                    e['predecessor'] != null ? e['predecessor'] as int : null,
                successor:
                    e['successor'] != null ? e['successor'] as int : null,
              ),
            )
            .toList();
    return tasksArr;
  }

  void updateTask(Task task) async {
    Database db = await database;
    await db.rawUpdate(
      '''
      UPDATE $_todoTableName SET $_titleColumn=?, $_contentColumn=?, $_statusColumn=?, $_dateColumn=?, $_predecessorColumn=?, $_successorColumn=?
      WHERE $_idColumn=?
    ''',
      [
        task.title,
        task.content,
        task.status,
        task.date?.millisecondsSinceEpoch,
        task.predecessor,
        task.successor,
        task.id,
      ],
    );
  }

  void deleteTask(Task task) async {
    Database db = await database;
    await db.rawDelete(
      '''
      DELETE FROM $_todoTableName WHERE $_idColumn=?
    ''',
      [task.id],
    );
  }

  // if no settings row is created, default settings row is created in 'settings' table
  Future<Settings> getSettings() async {
    Database db = await database;

    Settings settings = Settings(alarmSound: AlarmSound());

    await db.transaction((txn) async {
      List<Map<String, Object?>> settingsMapList = await txn.rawQuery('''
      SELECT * FROM $_settingsTableName
    ''');

      if (settingsMapList.isEmpty) {
        Settings initSettings = Settings(alarmSound: AlarmSound());
        await txn.insert(_settingsTableName, {
          _propertyColumn: SettingsProps.themeMode,
          _valueColumn:
              initSettings.themeMode == ThemeMode.light ? 'light' : 'dark',
        });
        await txn.insert(_settingsTableName, {
          _propertyColumn: SettingsProps.alarmSoundName,
          _valueColumn: initSettings.alarmSound.name,
        });
        await txn.insert(_settingsTableName, {
          _propertyColumn: SettingsProps.alarmSoundLocation,
          _valueColumn: initSettings.alarmSound.location,
        });

        settings = initSettings;
      } else {
        Map<String, String> temp_settingsMap = {};
        for (var e in settingsMapList) {
          temp_settingsMap[e[_propertyColumn] as String] =
              e[_valueColumn] as String;
        }
        settings = Settings(
          themeMode:
              temp_settingsMap[SettingsProps.themeMode] == 'light'
                  ? ThemeMode.light
                  : ThemeMode.dark,
          alarmSound: AlarmSound(
            name: temp_settingsMap[SettingsProps.alarmSoundName]!,
            location: temp_settingsMap[SettingsProps.alarmSoundLocation]!,
          ),
        );
      }
    });
    return settings;
  }

  void updateThemeMode(ThemeMode themeMode) async {
    Database db = await database;
    await db.rawUpdate(
      '''
      UPDATE $_settingsTableName SET $_valueColumn=?
      WHERE $_propertyColumn=?
    ''',
      [
        themeMode == ThemeMode.light ? 'light' : 'dark',
        SettingsProps.themeMode,
      ],
    );
  }

  void updateAlarmSound(AlarmSound alarmSound) async {
    Database db = await database;
    await db.transaction((txn) async {
      await txn.rawUpdate(
        '''
      UPDATE $_settingsTableName SET $_valueColumn=?
      WHERE $_propertyColumn=?
      ''',
        [alarmSound.name, SettingsProps.alarmSoundName],
      );
      await txn.rawUpdate(
        '''
      UPDATE $_settingsTableName SET $_valueColumn=?
      WHERE $_propertyColumn=?
      ''',
        [alarmSound.location, SettingsProps.alarmSoundLocation],
      );
    });
  }
}
