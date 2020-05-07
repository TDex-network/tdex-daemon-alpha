FROM node:12

# Create app directory
WORKDIR /root

# Install app dependencies
RUN npm install grpc
COPY ./bin/tdex-daemon-linux ./tdex-daemon

EXPOSE 9945
EXPOSE 9000

ENTRYPOINT [ "./tdex-daemon"]