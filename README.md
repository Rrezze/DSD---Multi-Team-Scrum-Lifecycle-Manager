# DSD---Multi-Team-Scrum-Lifecycle-Manager

## Tech stack

- **Backend:** Django + Django REST;
- **Database:** PostgreSQL 16;
- **Frontend:** React.js + Vite;
- **CI:** GitHub Actions;
- **Infrastructure:** Docker / Docker Compose;

## Prerequisites

The following technologies are required to proceed:

- [Git](https://git-scm.com/)
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2 

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/Rrezze/DSD---Multi-Team-Scrum-Lifecycle-Manager
cd DSD---Multi-Team-Scrum-Lifecycle-Manager
```

### 2. Create personal `.env` file

```bash
cp .env.example .env
```
Make sure to never share or commit your `.env` file as it contains sensitive information!

### 3. Generate a Django secret key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

or by running a docker container, if python is not locally installed:

```bash
docker run --rm python:3.12-slim python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 4. Update `.env` values:

| Variable | Meaning | Content |
|---|---|---|
| `POSTGRES_DB` | Database name | keep default (`scrum`) |
| `POSTGRES_USER` | Database user | keep default (`scrum`) |
| `POSTGRES_PASSWORD` | Database password | (_a password of choice_) |
| `DJANGO_DEBUG` | Django debug mode | `1` for development, `0` for production |
| `DJANGO_SECRET_KEY` | Django secret key | (_paste your django key here_) |
| `DJANGO_ALLOWED_HOSTS` | Allowed hostnames |keep the default |


### 5. Build and start the containers:

```bash
docker compose up --build
```


### 6. Apply the database migrations:

In a second terminal, while the containers are running:

```bash
docker compose exec backend python manage.py migrate
```

Run it again after pulling changes that include new migrations, or after resetting the database.

### 7. Open the app:

| Service | URL |
|---|---|
| Backend (Django) | http://localhost:8000 |
| Frontend | http://localhost:5173 |
| PostgreSQL | `localhost:5432` |

## Useful commands

| Task | Command |
|---|---|
| Stop orchestration | `docker compose down` |
| Start orchestration | `docker compose up` |
| View logs | `docker compose logs -f` |
| Reset the database (**deletes local data**) | `docker compose down -v` |