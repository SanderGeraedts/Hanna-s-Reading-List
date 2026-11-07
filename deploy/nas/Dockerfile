# PocketBase with this repo's database schema built in.
#
# GitHub Actions builds this on every push to main that touches deploy/nas/
# (.github/workflows/backend.yml) and publishes it as
# ghcr.io/sandergeraedts/reading-list-pocketbase:stable. Watchtower on the NAS
# notices the new image and restarts PocketBase with it; PocketBase applies
# any new migration on start-up.
#
# To update PocketBase itself, change the version here (read its changelog
# first: it's still pre-1.0).
FROM ghcr.io/muchobien/pocketbase:0.40.6

COPY pb_migrations /pb_migrations

LABEL org.opencontainers.image.source="https://github.com/SanderGeraedts/Hanna-s-Reading-List"
LABEL org.opencontainers.image.description="PocketBase account server for Hanna's Reading List, with its schema"
