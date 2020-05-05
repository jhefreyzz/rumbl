defmodule RumblWeb.UserSessionView do
  use RumblWeb, :view

  def render("user.json", %{user: user}) do
    %{id: user.id, name: user.name}
  end
end
