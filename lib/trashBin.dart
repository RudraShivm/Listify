// GestureDetector(
// onLongPressStart: (details) async {
// final result = await showMenu(
// context: context,
// position: RelativeRect.fromLTRB(
// details.globalPosition.dx,
// details.globalPosition.dy,
// details.globalPosition.dx + 1,
// details.globalPosition.dy + 1,
// ),
// items: [
// PopupMenuItem(value: 'edit', child: Text('Edit')),
// PopupMenuItem(value: 'delete', child: Text('Delete')),
// ],
// );
//
// if (result == 'edit') {
// _editTask(task);
// } else if (result == 'delete') {
// setState(() {
// _databaseServices.deleteTask(task);
// });
// }
// },
