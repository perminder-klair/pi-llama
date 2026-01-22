FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py database.py ./
ENV LLAMA_SERVER_URL=http://llama-server:5000
EXPOSE 4000
CMD ["python", "main.py"]
