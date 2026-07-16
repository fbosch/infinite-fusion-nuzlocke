{ config, pkgs, ... }:
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
  ];

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
