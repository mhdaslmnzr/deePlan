// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
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
const auth = getAuth(app);  // Initialize Auth
const database = getDatabase(app);  // Initialize Realtime Database
const tasksRef = ref(database, 'tasks');  // Reference to 'tasks' in the database

// Sign in anonymously
signInAnonymously(auth)
    .catch((error) => {
        console.error('Error during anonymous sign-in:', error);
    });

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    const dateTimeString = now.toLocaleString('en-US', options);
    document.getElementById('currentDateTime').textContent = dateTimeString;
}

setInterval(updateDateTime, 1000);
updateDateTime(); // Initial call

document.addEventListener('DOMContentLoaded', function() {
    const tasks = [];
    const taskContainer = document.getElementById('tasks');
    const addTaskButton = document.getElementById('addTaskButton');
    const taskModal = document.getElementById('taskModal');
    const cancelButton = document.getElementById('cancelButton');
    const taskForm = document.getElementById('taskForm');
    const errorMessage = document.getElementById('errorMessage');
    const noTasksMessage = document.getElementById('noTasksMessage');
    const modalTitle = document.getElementById('modalTitle');
    const submitButton = document.getElementById('submitButton');
    let editingTaskId = null;

    addTaskButton.addEventListener('click', () => {
        openModal();
    });

    cancelButton.addEventListener('click', () => {
        closeModal();
    });

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskName = document.getElementById('taskName').value.trim();
        const taskDate = document.getElementById('taskDate').value;
    
        if (!taskName) {
            errorMessage.classList.remove('hidden');
            return;
        }
    
        errorMessage.classList.add('hidden');

        if (editingTaskId) {
            update(ref(database, `tasks/${editingTaskId}`), { name: taskName, date: taskDate })
                .then(() => {
                    console.log('Task updated successfully');
                    closeModal();
                    fetchTasks();
                })
                .catch(error => {
                    console.error('Error updating task: ', error);
                });
        } else {
            const newTaskRef = push(tasksRef);
            set(newTaskRef, { name: taskName, date: taskDate, completed: false })
                .then(() => {
                    console.log('Task added successfully');
                    closeModal();
                    fetchTasks();
                })
                .catch(error => {
                    console.error('Error adding task: ', error);
                });
        }
    });

    function openModal(task = null) {
        taskModal.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        if (task) {
            document.getElementById('taskName').value = task.name;
            document.getElementById('taskDate').value = task.date || '';
            editingTaskId = task.id;
            modalTitle.textContent = 'Edit Task';
            submitButton.textContent = 'Update Task';
        } else {
            taskForm.reset();
            editingTaskId = null;
            modalTitle.textContent = 'Add New Task';
            submitButton.textContent = 'Add Task';
        }
    }

    function closeModal() {
        taskModal.classList.add('hidden');
        errorMessage.classList.add('hidden');
        editingTaskId = null;
    }

    function fetchTasks() {
        get(tasksRef)
            .then(snapshot => {
                tasks.length = 0;
                snapshot.forEach(childSnapshot => {
                    tasks.push({ id: childSnapshot.key, ...childSnapshot.val() });
                });
                console.log('Fetched tasks:', tasks);
                renderTasks();
            })
            .catch(error => {
                console.error('Error fetching tasks: ', error);
            });
    }

    function renderTasks() {
        taskContainer.innerHTML = '';
        const pendingTasks = tasks.filter(task => !task.completed);
        const completedTasks = tasks.filter(task => task.completed);

        if (tasks.length === 0) {
            noTasksMessage.classList.remove('hidden');
            noTasksMessage.textContent = "No tasks yet. Add some!";
        } else {
            noTasksMessage.classList.add('hidden');

            const pendingTasksContainer = document.createElement('div');
            pendingTasksContainer.className = 'mb-4 p-4 bg-white rounded-lg shadow-md';
            pendingTasksContainer.innerHTML = '<h2 class="text-xl font-bold mb-2">Pending Tasks</h2>';
            if (pendingTasks.length === 0) {
                pendingTasksContainer.innerHTML += '<p class="text-gray-500">No new tasks. Add some!</p>';
            } else {
                renderTaskGroup(pendingTasks, pendingTasksContainer);
            }
            taskContainer.appendChild(pendingTasksContainer);

            const completedTasksContainer = document.createElement('div');
            completedTasksContainer.className = 'p-4 bg-white rounded-lg shadow-md';
            completedTasksContainer.innerHTML = '<h2 class="text-xl font-bold mb-2">Completed Tasks</h2>';
            if (completedTasks.length === 0) {
                completedTasksContainer.innerHTML += '<p class="text-gray-500">Tasks deleted due to retention policy.</p>';
            } else {
                renderTaskGroup(completedTasks, completedTasksContainer);
            }
            taskContainer.appendChild(completedTasksContainer);
        }
    }

    function renderTaskGroup(tasks, container) {
        tasks.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            if (a.completed) {
                return new Date(b.completedDate) - new Date(a.completedDate);
            }
            const aDate = a.date ? new Date(a.date) : new Date(9999, 11, 31);
            const bDate = b.date ? new Date(b.date) : new Date(9999, 11, 31);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (aDate < today && bDate < today) {
                return aDate - bDate;
            }
            if (aDate < today) return -1;
            if (bDate < today) return 1;
            if (aDate.getTime() === today.getTime() && bDate.getTime() !== today.getTime()) return -1;
            if (bDate.getTime() === today.getTime() && aDate.getTime() !== today.getTime()) return 1;
            return aDate - bDate;
        }).forEach(task => {
            const taskElement = document.createElement('div');
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            const taskDate = task.date ? new Date(task.date) : null;
            if (taskDate) taskDate.setHours(0, 0, 0, 0);
            let daysLeft = taskDate ? Math.floor((taskDate - currentDate) / (1000 * 60 * 60 * 24)) : null;
            let dueClass = '';
            let dueText = '';

            if (task.completed) {
                dueClass = 'task-completed';
                dueText = 'Completed';
            } else if (!taskDate) {
                dueClass = 'due-later';
                dueText = 'No due date';
            } else if (daysLeft < 0) {
                dueClass = 'overdue';
                dueText = 'Overdue';
            } else if (daysLeft === 0) {
                dueClass = 'due-today';
                dueText = 'Due today';
            } else if (daysLeft <= 2) {
                dueClass = 'due-soon';
                dueText = `Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`;
            } else {
                dueClass = 'due-later';
                dueText = `Due in ${daysLeft} days`;
            }

            taskElement.className = `flex justify-between items-center border-b border-slate-200 py-3 px-2 border-l-4 ${dueClass} task-list-item task-list-gap m-1 rounded-md`;
            taskElement.innerHTML = `
                <div class="inline-flex items-center space-x-2">
                    <div>
                        <p class="text-lg">${task.name}</p>
                        <p class="text-sm">${dueText}</p>
                        <p class="text-sm">Deadline: ${task.date || 'None'}</p>
                    </div>
                </div>
                <div class="flex flex-col space-y-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-green-700 hover:text-green-900 hover:cursor-pointer complete-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-blue-700 hover:text-blue-900 hover:cursor-pointer edit-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-red-700 hover:text-red-900 hover:cursor-pointer delete-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </div>
            `;

            taskElement.querySelector('.complete-icon').addEventListener('click', () => {
                update(ref(database, `tasks/${task.id}`), { 
                    completed: !task.completed,
                    completedDate: task.completed ? null : new Date().toISOString()
                })
                    .then(() => {
                        fetchTasks();
                    })
                    .catch(error => {
                        console.error('Error updating task: ', error);
                    });
            });

            taskElement.querySelector('.edit-icon').addEventListener('click', () => {
                openModal(task);
            });

            taskElement.querySelector('.delete-icon').addEventListener('click', () => {
                remove(ref(database, `tasks/${task.id}`))
                    .then(() => {
                        fetchTasks();
                    })
                    .catch(error => {
                        console.error('Error deleting task: ', error);
                    });
            });

            container.appendChild(taskElement);
        });
    }

    fetchTasks();
});

function deleteOldCompletedTasks() {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    get(tasksRef).then(snapshot => {
        snapshot.forEach(childSnapshot => {
            const task = childSnapshot.val();
            if (task.completed && new Date(task.completedDate) < tenDaysAgo) {
                remove(ref(database, `tasks/${childSnapshot.key}`));
            }
        });
    });
}

setInterval(deleteOldCompletedTasks, 24 * 60 * 60 * 1000);