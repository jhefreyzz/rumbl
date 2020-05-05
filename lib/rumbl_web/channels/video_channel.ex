defmodule RumblWeb.VideoChannel do
  use RumblWeb, :channel

  alias Rumbl.Accounts
  alias Rumbl.Multimedia
  alias RumblWeb.AnnotationView
  alias RumblWeb.Presence

  @impl true
  def join("videos:" <> video_id, params, socket) do
    send(self(), :after_join)
    last_seen_id = params["last_seen_id"] || 0

    video_id = String.to_integer(video_id)
    video = Multimedia.get_video!(video_id)

    annotations =
      video
      |> Multimedia.list_annotations(last_seen_id)
      |> Phoenix.View.render_many(AnnotationView, "annotation.json")

    {:ok, %{annotations: annotations}, assign(socket, :video_id, video_id)}
    # if authorized?(payload) do
    #   {:ok, socket}
    # else
    #   {:error, %{reason: "unauthorized"}}
    # end
  end

  @impl true
  def handle_info(:after_join, socket) do
    user = Accounts.get_user!(socket.assigns.user_id)
    push(socket, "presence_state", Presence.list(socket))
    {:ok, _} = Presence.track(socket, user.id, %{device: "browser"})
    {:noreply, assign(socket, :current_user, user)}
  end

  @impl true
  def handle_in("new_annotation", params, socket) do
    case Multimedia.create_annotation(
           socket.assigns.current_user,
           socket.assigns.video_id,
           params
         ) do
      {:ok, annotation} ->
        broadcast!(socket, "new_annotation", %{
          id: annotation.id,
          user:
            RumblWeb.UserSessionView.render("user.json", %{user: socket.assigns.current_user}),
          body: annotation.body,
          at: annotation.at
        })

        {:reply, :ok, socket}

      {:error, changeset} ->
        {:reply, {:error, %{errors: changeset}}, socket}
    end
  end

  # Add authorization logic here as required.
  # defp authorized?(_payload) do
  #   true
  # end
end
