FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY . /app

RUN python -m pip install --no-cache-dir . gunicorn \
    && useradd --create-home --uid 10001 grapetree \
    && chown -R grapetree:grapetree /app

USER grapetree

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "1", "--timeout", "300", "grapetree.module:app"]
