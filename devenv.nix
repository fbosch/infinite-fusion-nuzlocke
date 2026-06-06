{ pkgs, ... }:

let
  no-mistakes = pkgs.buildGoModule rec {
    pname = "no-mistakes";
    version = "1.22.3";

    src = pkgs.fetchFromGitHub {
      owner = "kunchenguid";
      repo = "no-mistakes";
      rev = "v${version}";
      hash = "sha256-+8SPfOaQlG0oxSDsws9XqzqNnhjL/eA/nk+4osSxrck=";
    };

    vendorHash = "sha256-2pjiHVUwdQpXG9HTLW6wMZD+JpvFEcPMgBsVc6sck6w=";

    subPackages = [ "cmd/no-mistakes" ];
  };
in
{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs-slim_22;
    corepack.enable = true;
  };

  packages = [
    pkgs.git
    pkgs.gh
    pkgs.worktrunk
    no-mistakes
  ];

  tasks."no-mistakes:init" = {
    exec = "no-mistakes init";
    status = "no-mistakes status >/dev/null 2>&1 && git remote get-url no-mistakes >/dev/null 2>&1";
    before = [ "devenv:enterShell" ];
  };

  enterTest = ''
    no-mistakes --version
    git --version
    gh --version
    wt --version
    pnpm --version
  '';
}
