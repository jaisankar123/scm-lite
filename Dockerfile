# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and install dependencies
# This allows Docker to cache the installation step if requirements.txt doesn't change
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
# This includes main.py, server.py, producer.py, consumer.py, etc.
COPY . .

# Expose the port where the FastAPI/Uvicorn app will run
EXPOSE 8000

# The command to run the main FastAPI service is defined in docker-compose.yml
# as the Web App service, as the other services need different commands.

# Set the default entrypoint to python, which will be overridden by the compose file
ENTRYPOINT ["python"]