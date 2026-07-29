from django.core.management.base import BaseCommand
import asana
from asana.rest import ApiException
import environ
from datetime import datetime
import json

class Task:
    gid : str
    name : str
    notes : str
    completed : bool
    subtasks : list['Task']

    def __init__(self, name : str, notes : str, completed : bool , subtasks : list['Task'] = []):
        self.name = name
        self.notes = notes
        self.completed = completed
        self.subtasks = subtasks
    
    @staticmethod
    def save_as_json(tasks : list['Task']):
        with open(f'extra/advencement/tasks/task_{datetime.now().strftime("%Y-%m-%d_%H-%M-%S")}.json', 'w') as f:
            json.dump([{
                **task.__dict__,
                'subtasks': [subtask.__dict__ for subtask in task.subtasks]
            } for task in tasks], f)
            return f
    

class Command(BaseCommand):
    help = 'Make HTML report from asana'

    def handle(self, *args, **kwargs):
        env = environ.Env()
        # Configure personal access token
        configuration = asana.Configuration()
        configuration.access_token = env('ASANA_TOKEN')
        api_client = asana.ApiClient(configuration)

        tasks_api_instance = asana.TasksApi(api_client)

        # Generate HTML content with modern styling
        html_content = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Asana Project Report</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <script src="https://cdn.tailwindcss.com?plugins=typography"></script>

            <script>
                tailwind.config = {
                    darkMode: 'class',
                    theme: {
                        extend: {
                            colors: {
                                // You can add custom colors here if needed
                            }
                        }
                    }
                }
            </script>
            <script>
                // Check for saved theme preference or use system preference
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark')
                } else {
                    document.documentElement.classList.remove('dark')
                }

                // Function to toggle theme
                function toggleTheme() {
                    if (document.documentElement.classList.contains('dark')) {
                        document.documentElement.classList.remove('dark')
                        localStorage.theme = 'light'
                    } else {
                        document.documentElement.classList.add('dark')
                        localStorage.theme = 'dark'
                    }
                }
            </script>
        </head>
        <body class="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-200">
            <div class="container mx-auto p-2 md:p-8">
                <div class="text-center mb-12 p-2 md:p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-md">
                    <div class="fixed top-4 right-4 z-50">
                        <button onclick="toggleTheme()" class="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shadow-lg hover:shadow-xl">
                            <svg class="w-6 h-6 dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                            </svg>
                            <svg class="w-6 h-6 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                            </svg>
                        </button>
                    </div>
                    <h1 class="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4">Asana Project Report</h1>
                    <p class="text-slate-600 dark:text-slate-400">Generated on: """ + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + """</p>
                </div>
        """
        _tasks : list[Task] = []
        for task in tasks_api_instance.get_tasks_for_project('1210503690269970',{
            'opt_fields':"name,completed,notes"
        }):
            _task = Task(task['name'], task['notes'], task['completed'])
            status_class = "bg-green-100 text-green-800" if task["completed"] else "bg-yellow-100 text-yellow-800"
            status_text = "Completed" if task["completed"] else "Pending"
            
            html_content += f"""
                <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-6 shadow-md hover:-translate-y-1 transition-transform">
                    <h2 class="text-2xl font-semibold text-blue-600 dark:text-blue-400 mb-4">{task["name"]}</h2>
                    <div class="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg mb-4 text-slate-600 dark:text-slate-300 prose prose-base !max-w-none">{task['notes']}</div>
                    <span class="inline-block px-4 py-2 rounded-full text-sm font-medium {status_class} mb-4">{status_text}</span>
                    <div class="mt-4 pl-6">
            """

            subtasks = list(tasks_api_instance.get_subtasks_for_task(task['gid'],{
                'opt_fields':"name,completed,notes"
            }))

            _task.subtasks = [Task(subtask['name'], subtask['notes'], subtask['completed']) for subtask in subtasks]
            
            if not subtasks:
                html_content += '<p class="text-slate-500 dark:text-slate-400 italic">No subtasks yet</p>'
            else:
                for subtask in subtasks:
                    subtask_class = "line-through text-slate-400 dark:text-slate-500" if subtask["completed"] else ""
                    html_content += f'<div class="flex items-center my-2 {subtask_class}">• {subtask["name"]}</div>'

            html_content += """
                    </div>
                </div>
            """

            _tasks.append(_task)

        html_content += """
            </div>
        </body>
        </html>
        """

        with open(f'extra/advencement/reports/report_{datetime.now().strftime("%Y-%m-%d_%H-%M-%S")}.html', 'w', encoding='utf-8') as f:
            f.write(html_content)
            self.stdout.write(self.style.SUCCESS(f'Report saved to {f.name}'))
        
        file = Task.save_as_json(_tasks)
        self.stdout.write(self.style.SUCCESS(f'Tasks saved to {file.name}'))


