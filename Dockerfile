FROM alpine:latest


RUN adduser -S user
USER user
RUN echo $HOME

COPY tdex-daemon-linux-x64 /tdex-daemon

CMD ["/tdex-daemon"]

