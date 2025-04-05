import 'package:demo_proj_2/models/alarm_sound.dart';
import 'package:demo_proj_2/providers/alarm_provider.dart';
import 'package:demo_proj_2/providers/theme_provider.dart';
import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:provider/provider.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  final AudioPlayer _audioPlayer = AudioPlayer();

  // List of MP3 files from assets (manually defined)
  final List<AlarmSound> alarmSounds = [
    AlarmSound(name: 'Bedside Clock', location: 'assets/sounds/bedside.mp3'),
    AlarmSound(name: 'Funny', location: 'assets/sounds/funny-alarm.mp3'),
    AlarmSound(name: 'Marimba', location: 'assets/sounds/marimba-alarm.mp3'),
    AlarmSound(name: 'Two Face', location: 'assets/sounds/two-face.mp3'),
  ];
  String currentAudioPath = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Settings')),
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          ListTile(
            title: Text('Theme'),
            trailing: SegmentedButton<ThemeMode>(
              segments: <ButtonSegment<ThemeMode>>[
                ButtonSegment<ThemeMode>(
                  value: ThemeMode.light,
                  label: Text('light'),
                  icon: Icon(Icons.sunny),
                ),
                ButtonSegment<ThemeMode>(
                  value: ThemeMode.dark,
                  label: Text('dark'),
                  icon: Icon(Icons.nightlight),
                ),
              ],
              selected: {Provider.of<ThemeProvider>(context).themeMode},
              onSelectionChanged: (Set<ThemeMode> selectedTheme) {
                setState(() {
                  // when we don't want to listen to the provider, but change the state only
                  context.read<ThemeProvider>().setTheme(selectedTheme.first);
                });
              },
            ),
          ),
          ListTile(
            title: Text('Alarm Sound'),
            trailing: ElevatedButton(
              onPressed: () {
                _showSongSelectionDialog(context);
              },
              child: Text('Change'),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(left: 16.0),
            child: Text(
              'Selected Alarm Sound : ${Provider.of<AlarmProvider>(context).alarmSound.name}',
              style: TextStyle(fontStyle: FontStyle.italic),
            ),
          ),
        ],
      ),
    );
  }

  void _showSongSelectionDialog(BuildContext context) {
    showDialog(
      barrierDismissible: false,
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Select Alarm Sound'),
          content: SingleChildScrollView(
            child: StatefulBuilder(
              builder:
                  (context, StateSetter setState) => Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey, width: 0.5),
                    ),
                    child: SizedBox(
                      width: double.maxFinite, // Makes dialog wider
                      height: 200, // Fixed height for the list
                      child: ListView.builder(
                        itemCount: alarmSounds.length,
                        itemBuilder: (context, index) {
                          final sound = alarmSounds[index];
                          final soundPath = sound.location.replaceFirst(
                            'assets/',
                            '',
                          );
                          bool isPlaying =
                              currentAudioPath == soundPath &&
                              _audioPlayer.state == PlayerState.playing;

                          return ListTile(
                            contentPadding: const EdgeInsets.only(
                              right: 0,
                              left: 10,
                            ),
                            title: Text(sound.name),
                            trailing: IconButton(
                              icon:
                                  isPlaying
                                      ? Icon(Icons.pause_circle_sharp)
                                      : Icon(Icons.play_arrow_rounded),
                              onPressed: () async {
                                if (_audioPlayer.state == PlayerState.playing) {
                                  await _audioPlayer.stop();
                                  if (currentAudioPath == soundPath) {
                                    await _audioPlayer.stop();
                                  } else {
                                    await _audioPlayer.play(
                                      AssetSource(soundPath),
                                    );
                                  }
                                } else {
                                  await _audioPlayer.play(
                                    AssetSource(soundPath),
                                  );
                                }

                                setState(() {
                                  currentAudioPath = soundPath;
                                });
                              },
                            ),
                            onTap: () {
                              _audioPlayer.stop();
                              context.read<AlarmProvider>().setAlarmSound(
                                sound,
                              );
                              Navigator.pop(context);
                            },
                          );
                        },
                      ),
                    ),
                  ),
            ),
          ),
          actions: [
            TextButton(
              style: ButtonStyle(
                backgroundColor: WidgetStatePropertyAll(
                  Color.fromRGBO(245, 224, 187, 1),
                ),
              ),
              onPressed: () async {
                await _audioPlayer.stop();
                if (context.mounted) {
                  Navigator.pop(context);
                } // Close dialog
              },
              child: Text('Cancel', style: TextStyle(fontSize: 16)),
            ),
          ],
        );
      },
    );
  }
}
