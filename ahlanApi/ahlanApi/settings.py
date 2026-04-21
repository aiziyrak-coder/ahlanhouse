from pathlib import Path
import os
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_local_env_file() -> None:
    """
    ahlanApi/.env faylini o'qiydi (KEY=value). Tizim muhitida allaqachon bor bo'lsa, ustidan yozmaydi.
    Gunicorn/systemd faqat muhit beradi; `manage.py` va dev uchun .env qulay.
    """
    path = BASE_DIR / ".env"
    if not path.is_file():
        return
    try:
        raw = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return
    raw = raw.lstrip("\ufeff")
    for line in raw.splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        if s.lower().startswith("export "):
            s = s[7:].strip()
        key, _, val = s.partition("=")
        key = key.strip()
        if not key:
            continue
        val = val.strip().strip('"').strip("'")
        # setdefault bo'sh "" uchun ishlamaydi — systemd bo'sh TELEGRAM_BOT_TOKEN bersa .env o'qilmay qolardi
        prev = os.environ.get(key)
        if prev is None or (isinstance(prev, str) and not prev.strip()):
            os.environ[key] = val


_load_local_env_file()

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-dev-only-change-in-production')
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('1', 'true', 'yes')
_default_hosts = 'ahlan.uz,api.ahlan.uz,64.226.109.56,localhost,127.0.0.1'
_allowed = [h.strip() for h in os.environ.get('DJANGO_ALLOWED_HOSTS', _default_hosts).split(',') if h.strip()]
ALLOWED_HOSTS = _allowed if _allowed else _default_hosts.split(',')

INSTALLED_APPS = [
    # 'jazzmin',  # Disabled: incompatible with Python 3.14 (AttributeError in changelist_view)
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'drf_spectacular',
    'drf_yasg',
    'rest_framework_simplejwt',
    'corsheaders',
    'rest_framework.authtoken',
    'rest_framework_simplejwt.token_blacklist',
    'django_crontab',
    'django_apscheduler',
    'all',
]

CRONJOBS = [
    ('0 0 * * *', 'all.cron.update_overdue_payments'),
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # ENG TEPAGA CHIQARILDI (MUHIM!)
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'ahlanApi.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'ahlanApi.wsgi.application'

AUTH_USER_MODEL = 'all.User'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# HTTPS VA FRONTEND UCHUN TO'G'RILANGAN CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ahlan.uz",
    "https://www.ahlan.uz",
    "https://api.ahlan.uz",
]

CORS_ALLOW_CREDENTIALS = True

# HTTPS VA LOCAL DEV UCHUN CSRF
CSRF_TRUSTED_ORIGINS = [
    "https://ahlan.uz",
    "https://api.ahlan.uz",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_PAGINATION_CLASS': 'all.pagination.CustomPagination',
    'PAGE_SIZE': 10,
}

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Tashkent'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Fayl yuklash limitlari (MB) — katta fayllar server xotirasini to'ldirmasligi uchun
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024   # 10 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024   # 10 MB

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=7),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=10),
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# JAZZMIN SOZLAMALARI (O'ZGARISHSIZ QOLDIRILDI)
JAZZMIN_SETTINGS = {
    "site_title": "CRM",
    "site_header": "CRM Admin",
    "site_brand": "CRM",
    "welcome_sign": "Welcome to CRM!",
    "show_sidebar": True,
    "navigation_expanded": True,
}

JAZZMIN_UI_TWEAKS = {
    "theme": "darkly",
    "dark_mode_theme": "slate",
}

# Telegram: bot token faqat serverda (CORS va token xavfsizligi uchun proxy ishlatiladi)
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
