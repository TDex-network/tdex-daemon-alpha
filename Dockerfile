FROM alpine:latest


COPY tdex-daemon-linux-x64 /tdex-daemon

RUN cd /home && ls
RUN chmod 777 -R .


