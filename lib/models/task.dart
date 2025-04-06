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
  Task copyWith({int? id, String? title, String? content, int? status, DateTime? date, int? predecessor, int?successor }){
    return Task(
      id: id?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      status: status ?? this.status,
      date: date ?? this.date,
      predecessor: predecessor ?? this.predecessor,
      successor: successor ?? this.successor
    );
  }
}
