from django.apps import AppConfig

class AllConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'all'

    def ready(self):
        pass  # Hozircha hech narsa qilmaymiz