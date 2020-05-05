import Player from "./player";
import { Presence } from "phoenix";
let Video = {
  init(socket, element) {
    if (!element) {
      return;
    }
    let playerId = element.getAttribute("data-player-id");
    let videoId = element.getAttribute("data-id");
    socket.connect();
    Player.init(element.id, playerId, () => {
      this.onReady(videoId, socket);
    });
  },

  onReady(videoId, socket) {
    let messageContainer = document.getElementById("message-container");
    let messageInput = document.getElementById("message-input");
    let postButton = document.getElementById("message-submit");
    let userList = document.getElementById("user-list");
    let lastSeenId = 0;
    let vidChannel = socket.channel("videos:" + videoId, () => {
      return { last_seen_id: lastSeenId };
    });
    let presence = new Presence(vidChannel);
    presence.onSync(() => {
      userList.innerHTML = presence
        .list((id, { user: user, metas: [first, ...rest] }) => {
          let count = rest.length + 1;
          return `<li>${user.name}: (${count})</li>`;
        })
        .join("");
    });
    messageContainer.addEventListener("click", (e) => {
      e.preventDefault();
      let seconds =
        e.target.getAttribute("data-seek") ||
        e.target.parentNode.getAttribute("data-seek");
      if (!seconds) {
        return;
      }
      Player.seekTo(seconds);
    });

    postButton.addEventListener("click", (e) => {
      let payload = { body: messageInput.value, at: Player.getCurrentTime() };
      vidChannel.push("new_annotation", payload);
      messageInput.value = "";
    });

    vidChannel.on("new_annotation", (resp) => {
      lastSeenId = resp.id;
      this.renderAnnotation(messageContainer, resp);
    });

    vidChannel
      .join()
      .receive("ok", ({ annotations }) => {
        let ids = annotations.map((ann) => ann.id);
        if (ids.length > 0) {
          lastSeenId = Math.max(...ids);
        }
        this.scheduleMessages(messageContainer, annotations);
      })

      .receive("error", (reason) => console.log("join failed", reason));
  },
  esc(str) {
    let div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  },
  renderAnnotation(messageContainer, { user, body, at }) {
    let template = document.createElement("div");
    template.innerHTML = `
        <a href="#" data-seek="${this.esc(at)}">
        [${this.formatTime(at)}]
            <strong>${this.esc(user.name)}</strong>: ${this.esc(body)}
      </a>
      `;

    messageContainer.appendChild(template);
    messageContainer.scrollTop = messageContainer.scrollHeight;
  },
  scheduleMessages(messageContainer, annotations) {
    clearTimeout(this.scheduleTimer);
    this.schedulerTimer = setTimeout(() => {
      let ctime = Player.getCurrentTime();
      let remaining = this.renderAtTime(annotations, ctime, messageContainer);
      this.scheduleMessages(messageContainer, remaining);
    }, 1000);
  },
  renderAtTime(annotations, seconds, messageContainer) {
    return annotations.filter((ann) => {
      if (ann.at > seconds) {
        return true;
      } else {
        this.renderAnnotation(messageContainer, ann);
        return false;
      }
    });
  },
  formatTime(at) {
    let date = new Date(null);
    date.setSeconds(at / 1000);
    return date.toISOString().substr(14, 5);
  },
};

export default Video;
