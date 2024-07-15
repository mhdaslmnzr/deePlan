// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-analytics.js";
import { getDatabase, ref, set, get, update, remove, push } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAX8R_kTUe5EnrTDfzP5PsaqaIrxwNzpXk",
    authDomain: "deeplan-41bda.firebaseapp.com",
    databaseURL: "https://deeplan-41bda-default-rtdb.firebaseio.com",
    projectId: "deeplan-41bda",
    storageBucket: "deeplan-41bda.appspot.com",
    messagingSenderId: "690954571128",
    appId: "1:690954571128:web:3880e1b5cf0758624c0c8d",
    measurementId: "G-31DJ0LL3MT"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);  // Initialize Auth
const database = getDatabase(app);  // Initialize Realtime Database
const tasksRef = ref(database, 'tasks');  // Reference to 'tasks' in the database

// Sign in anonymously
signInAnonymously(auth)
    .catch((error) => {
        console.error('Error during anonymous sign-in:', error);
    });

document.addEventListener('DOMContentLoaded', function() {
    const tasks = [];
    const taskContainer = document.getElementById('tasks');
    const addTaskButton = document.getElementById('addTaskButton');
    const taskModal = document.getElementById('taskModal');
    const cancelButton = document.getElementById('cancelButton');
    const taskForm = document.getElementById('taskForm');
    const errorMessage = document.getElementById('errorMessage');
    const noTasksMessage = document.getElementById('noTasksMessage');

    // Show the task modal when the "+" button is clicked
    addTaskButton.addEventListener('click', () => {
        taskModal.classList.remove('hidden');
        errorMessage.classList.add('hidden');  // Reset the error message
    });

    // Close the task modal when the "Cancel" button is clicked
    cancelButton.addEventListener('click', () => {
        taskModal.classList.add('hidden');
        errorMessage.classList.add('hidden');  // Reset the error message
    });

    // Handle task form submission
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskName = document.getElementById('taskName').value;
        const taskDate = document.getElementById('taskDate').value;

        if (taskName) {
            errorMessage.classList.add('hidden');  // Hide error message
            const newTaskRef = push(tasksRef);  // Push a new task to the database
            set(newTaskRef, { name: taskName, date: taskDate, completed: false })
                .then(() => {
                    console.log('Task added successfully');  // Log success
                    taskForm.reset();
                    taskModal.classList.add('hidden');
                    fetchTasks();  // Fetch tasks after adding
                })
                .catch(error => {
                    console.error('Error adding task: ', error);  // Log errors
                });
        } else {
            errorMessage.classList.remove('hidden');  // Show error message
        }
    });

    // Fetch tasks from Firebase and render them
    function fetchTasks() {
        get(tasksRef)
            .then(snapshot => {
                tasks.length = 0;  // Clear existing tasks
                snapshot.forEach(childSnapshot => {
                    tasks.push({ id: childSnapshot.key, ...childSnapshot.val() });
                });
                console.log('Fetched tasks:', tasks);  // Log tasks
                renderTasks();  // Render tasks
            })
            .catch(error => {
                console.error('Error fetching tasks: ', error);  // Log errors
            });
    }

    // Render tasks on the page
    function renderTasks() {
        taskContainer.innerHTML = '';
        if (tasks.length === 0) {
            noTasksMessage.classList.remove('hidden');
        } else {
            noTasksMessage.classList.add('hidden');
            tasks.sort((a, b) => {
                if (a.completed !== b.completed) {
                    return a.completed - b.completed;  // Incomplete tasks first
                }
                return new Date(b.date) - new Date(a.date);  // Recently added tasks first
            }).forEach(task => {
                const taskElement = document.createElement('div');
                const currentDate = new Date();
                const taskDate = new Date(task.date);
                let daysLeft = Math.ceil((taskDate - currentDate) / (1000 * 60 * 60 * 24));
                let dueClass = '';

                if (task.completed) {
                    dueClass = 'task-completed';
                } else {
                    if (daysLeft < 0) {
                        dueClass = 'overdue';
                        daysLeft = 'Overdue';
                    } else if (daysLeft === 0) {
                        dueClass = 'due-today';
                        daysLeft = 'Due today';
                    } else if (daysLeft === 1) {
                        dueClass = 'due-tomorrow';
                        daysLeft = 'Due tomorrow';
                    } else {
                        dueClass = 'due-later';
                        daysLeft = `Due in ${daysLeft} days`;
                    }
                }

                taskElement.className = `flex justify-between items-center border-b border-slate-200 py-3 px-2 border-l-4 ${dueClass} task-list-item task-list-gap m-1 rounded-md`;
                taskElement.innerHTML = `
                    <div class="inline-flex items-center space-x-2">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-slate-500 hover:text-indigo-600 hover:cursor-pointer complete-icon">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 12.75l3 3 7.5-7.5" />
                            </svg>
                        </div>
                        <div>
                            <p class="text-lg">${task.name}</p>
                            <p class="text-sm text-slate-500">${daysLeft}</p>
                        </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-red-500 hover:text-red-700 hover:cursor-pointer delete-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                `;

                // Mark task as completed
                taskElement.querySelector('.complete-icon').addEventListener('click', () => {
                    update(ref(database, `tasks/${task.id}`), { completed: !task.completed })
                        .then(() => {
                            fetchTasks();  // Re-fetch tasks after updating
                        })
                        .catch(error => {
                            console.error('Error updating task: ', error);
                        });
                });

                // Delete task
                taskElement.querySelector('.delete-icon').addEventListener('click', () => {
                    remove(ref(database, `tasks/${task.id}`))
                        .then(() => {
                            fetchTasks();  // Re-fetch tasks after deleting
                        })
                        .catch(error => {
                            console.error('Error deleting task: ', error);
                        });
                });

                taskContainer.appendChild(taskElement);
            });
        }
    }

    fetchTasks();  // Initial fetch of tasks
});
