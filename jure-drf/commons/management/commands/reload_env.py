from django.core.management.base import BaseCommand
import environ
import os
from pathlib import Path

class Command(BaseCommand):
    help = 'Reload environment variables from .env file'

    def handle(self, *args, **options):
        # Get the project root directory
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        
        # Path to .env file
        env_file = os.path.join(base_dir, '.env')
        
        if os.path.exists(env_file):
            # Create new env instance and reload
            env = environ.Env()
            environ.Env.read_env(env_file, overwrite=True)
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully reloaded environment variables from {env_file}')
            )
            
            # Show current environment variables (without sensitive data)
            self.stdout.write('\nCurrent environment variables:')
            for key, value in os.environ.items():
                if any(sensitive in key.lower() for sensitive in ['password', 'secret', 'key', 'token']):
                    self.stdout.write(f'{key}: {"*" * len(value)}')
                else:
                    self.stdout.write(f'{key}: {value}')
        else:
            self.stdout.write(
                self.style.ERROR(f'.env file not found at {env_file}')
            ) 