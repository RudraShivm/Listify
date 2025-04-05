class Task {
  int id;
  String title;
  String content;
  int status;
  DateTime? date;
  int? predecessor;
  int? successor;

  Task({
    this.id = 0,
    this.title = "No Title?",
    this.content = "no details whatsoever :')",
    this.status = 0,
    this.date,
    this.predecessor,
    this.successor,
  });
}
