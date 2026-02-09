using ClearDay.App.Interfaces;

namespace ClearDay.App.Utils;

public static class Menu
{
    public static void Show(ITaskService taskService)
    {
        while (true)
        {
            Console.Clear();
            Console.WriteLine("=== ClearDay ===");
            Console.WriteLine("1. Add task");
            Console.WriteLine("2. List tasks");
            Console.WriteLine("3. Complete task");
            Console.WriteLine("0. Exit");

            var option = Console.ReadLine();

            switch (option)
            {
                case "1":
                    Console.Write("Task title: ");
                    var title = Console.ReadLine();
                    Console.WriteLine($"Task {title} created.");
                    taskService.AddTask(title ?? "");
                    break;

                case "2":
                    foreach (var task in taskService.GetAllTasks())
                    {
                        Console.WriteLine(
                            $"{task.Id} | {(task.IsCompleted ? "[X]" : "[ ]")} {task.Title}"
                        );
                    }
                    Console.ReadKey();
                    break;

                case "3":
                    Console.Write("Task ID: ");
                    if (Guid.TryParse(Console.ReadLine(), out var id))
                        taskService.CompleteTask(id);
                    break;

                case "0":
                    return;
            }
        }
    }
}