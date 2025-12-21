# Makefile for building and running the Docker container

IMAGE_NAME = listify
CONTAINER_NAME = listify-container
PORT = 5173

build:
	docker build -t $(IMAGE_NAME):latest .

run:
	docker run --rm -it \
	-p $(PORT):$(PORT) \
	--name $(CONTAINER_NAME) \
	$(IMAGE_NAME):latest

stop:
	docker stop $(CONTAINER_NAME) || true

clean:
	docker rm $(CONTAINER_NAME) || true

# Run tests inside the container (if running)
test:
	docker exec -it $(CONTAINER_NAME) npm test || echo "Container not running. Start with 'make run' first."

# View logs from the running container
logs:
	docker logs -f $(CONTAINER_NAME)

# Open a shell inside the running container
shell:
	docker exec -it $(CONTAINER_NAME) sh || echo "Container not running. Start with 'make run' first."
