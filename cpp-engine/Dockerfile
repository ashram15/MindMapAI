FROM alpine:latest

# install c++ compiler 
RUN apk add --no-cache g++ make

WORKDIR /app

COPY . .

# Compile the server
# -static makes it self-contained and crash-proof
RUN g++ -O3 -static -o server server.cpp

# Expose the port
EXPOSE 8080

# Run the server
CMD ["./server"]
