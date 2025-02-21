// frontend/src/App.tsx
import { useState, useEffect } from "react";
import { getApiUrl } from "./config";
import styles from "./App.module.css";

interface Task {
  taskId: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const API_URL = getApiUrl();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks`);
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
        }),
      });
      setTitle("");
      setDescription("");
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Task Time Tracker</h1>
      </header>

      <main className={styles.main}>
        <section className={styles.createTaskSection}>
          <form onSubmit={createTask} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="title">Task Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description"
                required
              />
            </div>
            <button type="submit" className={styles.button}>
              Create Task
            </button>
          </form>
        </section>

        <section className={styles.tasksSection}>
          {tasks.length === 0 ? (
            <p className={styles.noTasks}>
              No tasks yet. Create your first task!
            </p>
          ) : (
            <div className={styles.taskGrid}>
              {tasks.map((task) => (
                <article key={task.taskId} className={styles.taskCard}>
                  <div className={styles.taskHeader}>
                    <h2>{task.title}</h2>
                    <span className={styles.taskStatus}>{task.status}</span>
                  </div>
                  <p className={styles.taskDescription}>{task.description}</p>
                  <time className={styles.taskDate}>
                    {new Date(task.createdAt).toLocaleString()}
                  </time>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
