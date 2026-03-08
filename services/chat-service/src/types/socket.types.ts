export enum MessageEvents {
  send = "message:send",
  new = "message:new",
  edit = "message:edit",
  delete = "messaage:delete"
}

export enum TypingEvents {
  start = "typing:start",
  stop = "type:stop"
}

export enum PresenceEvents {
  events = "presence:events",
  status = "presence:status",
  connected = "user:connected",
  disconnected = "user:disconnected",
  disconnect = "disconnect"
}
