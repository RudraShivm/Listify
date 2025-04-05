import 'dart:io';

import 'package:alarm/alarm.dart';
import 'package:alarm/model/volume_settings.dart';
import 'package:alarm/utils/alarm_set.dart';
import 'package:demo_proj_2/providers/alarm_provider.dart';
import 'package:demo_proj_2/models/settings.dart';
import 'package:demo_proj_2/models/task.dart';
import 'package:demo_proj_2/services/database_services.dart';
import 'package:demo_proj_2/settings_page.dart';
import 'package:demo_proj_2/theme/theme.dart';
import 'package:demo_proj_2/providers/theme_provider.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/rendering.dart';
import 'package:provider/provider.dart';

void main() async {
  debugPaintSizeEnabled = false;
  WidgetsFlutterBinding.ensureInitialized();
  Future.delayed(Duration.zero, () async {
    await Alarm.init();
  });

  final DatabaseServices _databaseServices = DatabaseServices.instance;
  Settings settings = await _databaseServices.getSettings();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => ThemeProvider(settings.themeMode),
        ),
        ChangeNotifierProvider(
          create: (_) => AlarmProvider(settings.alarmSound),
        ),
      ],
      child: MyApp(),
    ),
  ); // Add const for optimization
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'To-Do App',
      themeMode: Provider.of<ThemeProvider>(context).themeMode,
      theme: lightTheme,
      darkTheme: darkTheme,
      home: RootPage(),
    );
  }
}

class RootPage extends StatefulWidget {
  const RootPage({super.key});

  @override
  State<RootPage> createState() => _RootPageState();
}

class _RootPageState extends State<RootPage> {
  final DatabaseServices _databaseServices = DatabaseServices.instance;
  Task task = Task(date: DateTime.now());
  bool setAlarm = false;
  List<Task> tasks = [];
  Map<int, Task> tasksMap = {};

  @override
  void initState() {
    super.initState();
    // initiate settings if not done yet

    // alarm related
    Future.microtask(() => checkAndroidScheduleExactAlarmPermission());
    Alarm.ringing.listen((AlarmSet alarmSet) {
      for (final alarm in alarmSet.alarms) {
        _showAlarmModal(alarm);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('To-Do List'),
        actions: [
          IconButton(
            onPressed: () {
              Navigator.of(
                context,
              ).push(MaterialPageRoute(builder: (context) => SettingsPage()));
            },
            icon: Padding(
              padding: const EdgeInsets.only(right: 10.0),
              child: Icon(Icons.settings, size: 25),
            ),
          ),
        ],
      ),
      body: _homePage(),
      floatingActionButton: _addFloatingButton(),
    );
  }

  void _showAlarmModal(AlarmSettings alarm) {
    if (!mounted) return; // Prevent errors if the widget is unmounted

    showModalBottomSheet(
      context: context,
      isDismissible: false, // Prevent user from dismissing without action
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                "Alarm Ringing!",
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                alarm.notificationSettings.title,
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w300),
              ),
              SizedBox(height: 8),
              Text(
                alarm.notificationSettings.body,
                style: TextStyle(fontSize: 18),
              ),
              SizedBox(height: 20),
              ElevatedButton(
                onPressed: () async {
                  await Alarm.stop(alarm.id); // Stop the alarm
                  if (context.mounted) {
                    Navigator.of(context).pop(); // Close modal
                    setState(() {});
                  }
                },
                child: Text("Stop Alarm"),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> checkAndroidScheduleExactAlarmPermission() async {
    final status = await Permission.scheduleExactAlarm.status;
    debugPrint('Schedule exact alarm permission: $status.');
    if (status.isDenied) {
      debugPrint('Requesting schedule exact alarm permission...');
      final res = await Permission.scheduleExactAlarm.request();
      debugPrint(
        'Schedule exact alarm permission ${res.isGranted ? '' : 'not'} granted.',
      );
    }
  }

  // tasks list ordering
  List<Task> _sortTaskList(List<Task> tasks, Map<int, Task> tasksMap) {
    if (tasks.isEmpty) {
      return [];
    }
    List<Task> toVisit =
        tasks.where((task) => task.predecessor == null).toList();
    Set<int> visited = {};
    List<Task> orderedTasks = [];
    while (toVisit.isNotEmpty) {
      Task currentTask = toVisit.removeAt(0);
      if (visited.contains(currentTask.id)) {
        continue;
      }
      visited.add(currentTask.id);
      orderedTasks.add(currentTask);
      if (currentTask.successor != null) {
        toVisit.add(tasksMap[currentTask.successor]!);
      } else {
        break;
      }
    }
    return orderedTasks;
  }

  Future<int> _addTask(Task task) async {
    if (tasks.isNotEmpty) {
      task.successor = tasks[0].id;
    }
    task.date = setAlarm ? task.date : null;
    final newTaskId = await _databaseServices.addTask(task);
    if (tasksMap[task.successor] != null) {
      tasksMap[task.successor]!.predecessor = newTaskId;
      _databaseServices.updateTask(tasksMap[task.successor]!);
    }
    // Setting null for tasks without alarm. Saves us for storing another variable setAlarm in Database
    return newTaskId;
  }

  void _deleteTask(Task task) {
    if (tasksMap[task.predecessor] != null) {
      tasksMap[task.predecessor]!.successor = task.successor;
      _databaseServices.updateTask(tasksMap[task.predecessor]!);
    }
    if (tasksMap[task.successor] != null) {
      tasksMap[task.successor]!.predecessor = task.predecessor;
      _databaseServices.updateTask(tasksMap[task.successor]!);
    }
    _databaseServices.deleteTask(task);
  }

  void reorderMethod(int oldIndex, int newIndex) {
    setState(() {
      //  newIndex keeps the list as it is(it should not count the object that
      //  is being removed) and gives the new position in the list of size+1
      if (oldIndex < newIndex) {
        newIndex--;
      }

      final task1 = tasks[oldIndex];
      final task2 = tasks[newIndex];
      List<Task> updateList = [];
      // neighbours of would be reordered task update
      if (task1.predecessor != null) {
        tasksMap[task1.predecessor]!.successor = task1.successor;
        updateList.add(tasksMap[task1.predecessor]!);
      }
      if (task1.successor != null) {
        tasksMap[task1.successor]!.predecessor = task1.predecessor;
        updateList.add(tasksMap[task1.successor]!);
      }
      if (oldIndex < newIndex) {
        // down shift
        // reordered task will go below the task at newIndex

        // reordered task update
        task1.predecessor = task2.id;
        task1.successor = task2.successor;
        updateList.add(task1);
        // neighbours of reordered task update
        task2.successor = task1.id;
        updateList.add(task2);
        if (tasksMap[task1.successor] != null) {
          tasksMap[task1.successor]!.predecessor = task1.id;
          updateList.add(tasksMap[task1.successor]!);
        }
      } else if (oldIndex > newIndex) {
        // up shift
        // reordered task will go above the task at newIndex

        // reordered task update
        task1.successor = task2.id;
        task1.predecessor = task2.predecessor;
        updateList.add(task1);
        // neighbours of reordered task update
        task2.predecessor = task1.id;
        updateList.add(task2);
        if (tasksMap[task1.predecessor] != null) {
          tasksMap[task1.predecessor]!.successor = task1.id;
          updateList.add(tasksMap[task1.predecessor]!);
        }
      }
      for (var task in updateList) {
        _databaseServices.updateTask(task);
      }
    });
  }

  Widget _homePage() {
    return FutureBuilder(
      future: _databaseServices.getTasks(),
      // compute runs the function in background thread and thus doesn't block UI render
      builder: (context, snapshot) {
        tasks = List.from(snapshot.data ?? []);
        // I need tasksMap for reordering, so I pulled it out of _sortTaskList fn
        tasksMap = {for (var task in tasks) task.id: task};
        tasks = _sortTaskList(tasks, tasksMap);
        if (tasks.isEmpty) {
          return Container(
            alignment: Alignment.center,
            child: Text(
              'No tasks',
              style: TextStyle(fontSize: 20, color: Colors.grey),
            ),
          );
        } else {
          return ReorderableListView(
            onReorder: reorderMethod,
            children: [
              for (var task in tasks)
                Dismissible(
                  key: UniqueKey(),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: EdgeInsets.symmetric(horizontal: 20),
                    color: Colors.red,
                    child: Icon(Icons.delete, color: Colors.white),
                  ),
                  onDismissed: (_) {
                    setState(() {
                      _deleteTask(task);
                    });
                  },
                  child: ExpansionTile(
                    tilePadding: EdgeInsets.only(left: 10, right: 0),
                    title: Text(
                      task.title,
                      style: TextStyle(
                        decoration:
                            task.status == 1
                                ? TextDecoration.lineThrough
                                : TextDecoration.none,
                      ),
                    ),
                    expandedAlignment: Alignment.centerLeft,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        FutureBuilder(
                          future: Alarm.getAlarm(task.id),
                          builder: (context, snapshot) {
                            bool hasUpcomingAlarm = snapshot.hasData;
                            if (hasUpcomingAlarm) {
                              return Icon(Icons.alarm, size: 20);
                            } else if (!hasUpcomingAlarm && task.date != null) {
                              return Icon(Icons.alarm_off, size: 20);
                            } else {
                              return SizedBox.square(dimension: 20);
                            }
                          },
                        ),
                        PopupMenuButton(
                          icon: Icon(Icons.more_vert),
                          itemBuilder:
                              (context) => [
                                PopupMenuItem(
                                  value: 'edit',
                                  child: Text('Edit'),
                                ),
                                PopupMenuItem(
                                  value: 'delete',
                                  child: Text('Delete'),
                                ),
                              ],
                          onSelected: (result) {
                            if (result == 'edit') {
                              _editTask(task);
                            } else if (result == 'delete') {
                              setState(() {
                                _deleteTask(task);
                              });
                            }
                          },
                        ),
                      ],
                    ),
                    leading: Checkbox(
                      value: task.status == 1 ? true : false,
                      onChanged: (bool? newBool) {
                        task.status = task.status == 1 ? 0 : 1;
                        setState(() {
                          _databaseServices.updateTask(task);
                        });
                      },
                    ),
                    children: [
                      Padding(
                        padding: EdgeInsets.only(left: 80, right: 55),
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 10),
                          child: Text(
                            task.content,
                            style: TextStyle(fontSize: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          );
        }
      },
    );
  }

  Widget _addFloatingButton() {
    return FloatingActionButton(
      onPressed: () {
        showDialog(
          context: context,
          builder: (context) {
            return StatefulBuilder(
              builder:
                  (BuildContext context, StateSetter setState) => AlertDialog(
                    title: Text('Create New Task'),
                    content: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextField(
                          maxLength: 21,
                          decoration: InputDecoration(
                            border: OutlineInputBorder(),
                            hintText: 'title of the task...',
                            hintStyle: TextStyle(fontStyle: FontStyle.italic),
                          ),
                          onChanged: (e) {
                            task.title = e;
                          },
                        ),
                        TextField(
                          maxLines: 3,
                          decoration: InputDecoration(
                            border: OutlineInputBorder(),
                            hintText: 'further details about this task...',
                            hintStyle: TextStyle(fontStyle: FontStyle.italic),
                          ),
                          onChanged: (e) {
                            task.content = e;
                          },
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(
                                right: 18.0,
                                left: 0.0,
                              ),
                              child: TextButton(
                                style: ButtonStyle(
                                  padding: WidgetStateProperty.all(
                                    EdgeInsets.symmetric(horizontal: 0),
                                  ),
                                  overlayColor: WidgetStateProperty.all(
                                    Colors.transparent,
                                  ),
                                  splashFactory: NoSplash.splashFactory,
                                ),
                                child: Row(
                                  children: [
                                    Checkbox(
                                      value: setAlarm,
                                      onChanged: (bool? newBool) {
                                        setState(() {
                                          setAlarm = newBool!;
                                        });
                                      },
                                    ),
                                    Text(
                                      'Set Alarm',
                                      style: TextStyle(
                                        fontSize: 16.0,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                                onPressed: () {
                                  setState(() {
                                    setAlarm = !setAlarm;
                                  });
                                },
                              ),
                            ),
                            ElevatedButton(
                              onPressed:
                                  setAlarm
                                      ? () async {
                                        await pickDateTime(setState);
                                      }
                                      : null,
                              style: ButtonStyle(
                                backgroundColor: WidgetStateProperty<
                                  Color?
                                >.fromMap(<WidgetStatesConstraint, Color?>{
                                  WidgetState.error: Colors.red,
                                  WidgetState.hovered & WidgetState.focused:
                                      Colors.blueAccent,
                                  WidgetState.focused: Colors.blue,
                                  WidgetState.disabled: Colors.grey,
                                }),
                                textStyle: WidgetStateProperty.all(
                                  TextStyle(fontSize: 15.0),
                                ),
                                padding: WidgetStatePropertyAll(
                                  EdgeInsets.symmetric(
                                    vertical: 4.0,
                                    horizontal: 6.0,
                                  ),
                                ),
                                shape: WidgetStatePropertyAll(
                                  RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10.0),
                                  ),
                                ),
                              ),
                              child: Text(
                                '${task.date?.day}/${task.date?.month}/${task.date?.year} ${task.date?.hour}:${task.date?.minute}',
                              ),
                            ),
                          ],
                        ),
                        Consumer<AlarmProvider>(
                          builder:
                              (context, value, child) => ElevatedButton(
                                onPressed: () async {
                                  //regardless of the picked time, the alarm will set if the setAlarm is on. We have to be careful that task.date is not null ever so that PickDate button has some time to show. Otherwise it will be null.
                                  // task.date null will result in a task without an alarm
                                  final id = await _addTask(task);
                                  if (setAlarm) {
                                    final alarmSettings = AlarmSettings(
                                      id: id,
                                      dateTime: task.date!,
                                      assetAudioPath: value.alarmSound.location,
                                      loopAudio: true,
                                      vibrate: true,
                                      warningNotificationOnKill: Platform.isIOS,
                                      androidFullScreenIntent: true,
                                      volumeSettings: VolumeSettings.fade(
                                        volume: 0.8,
                                        fadeDuration: Duration(seconds: 5),
                                        volumeEnforced: true,
                                      ),
                                      notificationSettings:
                                          NotificationSettings(
                                            title: task.title,
                                            body: task.content,
                                            stopButton: 'Stop the alarm',
                                            icon: 'notification_icon',
                                            iconColor: Color(
                                              0xFFFFCFA5,
                                            ), // Fixed color
                                          ),
                                    );
                                    await Alarm.set(
                                      alarmSettings: alarmSettings,
                                    );
                                  }
                                  //reset states
                                  setAlarm = false;
                                  task = Task(date: DateTime.now());
                                  if (context.mounted) {
                                    Navigator.of(
                                      context,
                                    ).pop(); // Closes the dialog
                                    setState(() {});
                                  }
                                },
                                child: Text('Create'),
                              ),
                        ),
                      ],
                    ),
                  ),
            );
          },
        ).then((_) {
          if (mounted) {
            Future.microtask(() => setState(() {}));
          }
        });
      },
      child: Icon(Icons.add),
    );
  }

  void _editTask(Task task) {
    showModalBottomSheet(
      context: context,
      builder: (BuildContext context) {
        return Padding(
          padding: const EdgeInsets.all(15.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.only(bottom: 10.0),
                child: Text(
                  'Edit Task',
                  style: TextStyle(fontSize: 25.0, fontWeight: FontWeight.w500),
                  textAlign: TextAlign.start,
                ),
              ),
              TextField(
                maxLength: 21,
                decoration: InputDecoration(
                  hintText: 'title of the task...',
                  border: OutlineInputBorder(),
                  hintStyle: TextStyle(fontStyle: FontStyle.italic),
                ),
                controller: TextEditingController(text: task.title),
                onChanged: (e) {
                  task.title = e;
                },
              ),
              TextField(
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'further details about this task...',
                  border: OutlineInputBorder(),
                  hintStyle: TextStyle(fontStyle: FontStyle.italic),
                ),
                controller: TextEditingController(text: task.content),
                onChanged: (e) {
                  task.content = e;
                },
              ),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _databaseServices.updateTask(task);
                    Navigator.of(context).pop();
                  });
                },
                child: Text('Done'),
              ),
            ],
          ),
        );
      },
    );
  }

  Future pickDateTime(StateSetter setState) async {
    DateTime? date = await pickDate();
    if (date == null) {
      return;
    }
    TimeOfDay? time = await pickTime();
    if (time == null) {
      return;
    }
    final dateTime = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    setState(() {
      task.date = dateTime;
    });
  }

  Future<DateTime?> pickDate() => showDatePicker(
    context: context,
    firstDate: DateTime.now(),
    lastDate: DateTime(2100),
  );

  Future<TimeOfDay?> pickTime() =>
      showTimePicker(context: context, initialTime: TimeOfDay.now());
}
