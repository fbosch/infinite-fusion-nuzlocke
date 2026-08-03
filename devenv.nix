{ config, pkgs, ... }:
let
  chromiumRuntimeLibs = with pkgs; [
    glib
    nss
    nspr
    atk
    at-spi2-core
    at-spi2-atk
    cairo
    cups
    dbus
    libX11
    libXcomposite
    libXdamage
    libXext
    libXfixes
    libXrandr
    libgbm
    libdrm
    expat
    libxcb
    libxkbcommon
    pango
    udev
    wayland
    alsa-lib
  ];
in
{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs-slim_24;
    corepack.enable = true;
  };

  packages = [
    pkgs.git
    pkgs.gh
    pkgs.worktrunk
  ] ++ pkgs.lib.optionals pkgs.stdenv.isLinux chromiumRuntimeLibs;

  env = pkgs.lib.optionalAttrs pkgs.stdenv.isLinux {
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath chromiumRuntimeLibs;
  };

  tasks."pnpm:install" = {
    exec = "pnpm install --frozen-lockfile --prefer-offline";
    status = ''
      [ -d node_modules/.pnpm ] && [ node_modules/.modules.yaml -nt package.json ] && [ node_modules/.modules.yaml -nt pnpm-lock.yaml ]
    '';
    before = [ "devenv:enterShell" ];
  };

  tasks."git-hooks:init" = {
    exec = "pnpm exec lefthook install";
    status = ''
      [ -z "$(git config --get --local core.hooksPath 2>/dev/null)" ] && [ -x "$(git rev-parse --git-path hooks/pre-commit)" ] && [ -x "$(git rev-parse --git-path hooks/pre-push)" ]
    '';
    after = [ "pnpm:install" ];
    before = [ "devenv:enterShell" ];
  };

  enterTest = ''
    git --version
    gh --version
    wt --version
    pnpm --version
  '';
}
