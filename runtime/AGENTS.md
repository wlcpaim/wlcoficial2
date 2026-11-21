# runtime/

- Worker RPCs (claim/heartbeat/finish/save checkpoint) are executable only by the service role; this external worker needs a service-role key that Lovable Cloud does not expose, so it stays optional.
