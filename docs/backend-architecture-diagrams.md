# WeatherHub Backend — Architecture Diagrams

Pure-tech architecture reference. Diagrams only.

---

## 1. System topology

```mermaid
flowchart TB
    subgraph Edge["Edge / Field"]
        ESP1["ESP32 · enit · rooftop-A"]
        ESP2["ESP32 · enit · rooftop-B"]
        ESP3["ESP32 · esprit · quad"]
    end

    Broker[("MQTT Broker<br/>(Mosquitto)")]

    subgraph App["NestJS process"]
        Ingest["Ingest Worker"]
        API["HTTP + SSE API"]
        Sched["Schedulers"]
        ExpW["Exports Worker"]
    end

    subgraph Storage["Storage layer"]
        Master[("Master DB<br/>tenants")]
        T1[("Tenant DB · enit<br/>(TimescaleDB)")]
        T2[("Tenant DB · esprit<br/>(TimescaleDB)")]
        Disk["Local FS · exports/"]
    end

    subgraph Clients
        Ops["Operations UI<br/>Next.js"]
        Res["Researcher UI<br/>Next.js"]
        SDK["SDK / curl / CI"]
    end

    Ledger[("Hedera HCS<br/>(stubbed today)")]

    ESP1 & ESP2 & ESP3 -- "publish QoS 1" --> Broker
    Broker -- "subscribe" --> Ingest
    Ingest --> T1 & T2
    API --> Master
    API --> T1 & T2
    API --> Disk
    Sched --> T1 & T2
    Sched -. "anchor" .-> Ledger
    ExpW --> T1 & T2
    ExpW --> Disk
    Ops <-- "JWT" --> API
    Res <-- "JWT" --> API
    SDK <-- "API token" --> API
    API -- "SSE" --> Ops
    API -- "SSE" --> Res
```

---

## 2. Multi-tenancy — database-per-tenant

```mermaid
flowchart LR
    Req["Incoming request"]
    Sub["Subdomain<br/>enit.weatherhub.tn"]
    Hdr["X-Tenant header"]
    Mid["TenantContextMiddleware"]
    Master[("Master DB<br/>tenants table")]
    DSPool{{"Per-tenant DataSource pool"}}
    DS1[("DataSource · tenant_enit")]
    DS2[("DataSource · tenant_esprit")]
    DSn[("DataSource · ...")]

    Req --> Sub
    Req --> Hdr
    Sub --> Mid
    Hdr --> Mid
    Mid -- "lookup" --> Master
    Master -- "{slug, dbName, active}" --> Mid
    Mid -- "attach req.tenant" --> DSPool
    DSPool --> DS1 & DS2 & DSn
```

---

## 3. Per-tenant database schema

```mermaid
erDiagram
    USERS ||--o{ API_TOKENS : owns
    USERS ||--o{ ACCOUNT_PREFERENCES : has
    USERS ||--o{ GRANTS : requests
    STATIONS ||--o{ READINGS : produces
    STATIONS ||--o{ ALERTS : triggers
    STATIONS ||--o{ FORECASTS : projects
    STATIONS ||--o{ INTEGRITY_BATCHES : anchors
    API_TOKENS ||--o{ REQUEST_LOGS : audits
    USERS ||--o{ DATASETS : authors
    USERS ||--o{ EXPORTS : queues

    USERS {
        uuid id PK
        string email
        string passwordHash
        string role
    }
    STATIONS {
        uuid id PK
        string name
        string status
        timestamp lastSyncedAt
    }
    READINGS {
        uuid id PK
        uuid stationId
        timestamp recordedAt
        float temperatureC
        float humidityPct
    }
    ALERTS {
        uuid id PK
        uuid stationId
        string metric
        string severity
        string status
    }
    FORECASTS {
        uuid id PK
        uuid stationId
        string horizon
        jsonb items
    }
    INTEGRITY_BATCHES {
        uuid id PK
        uuid stationId
        string merkleRoot
        string hederaTopicId
        int hederaSequenceNumber
    }
    API_TOKENS {
        uuid id PK
        uuid userId
        string hashedToken
        jsonb scope
    }
    REQUEST_LOGS {
        uuid id PK
        uuid tokenId
        string path
        int statusCode
        int latencyMs
    }
    ACCOUNT_PREFERENCES {
        uuid id PK
        uuid userId
        jsonb notifications
    }
    DATASETS {
        uuid id PK
        uuid ownerId
        string visibility
    }
    EXPORTS {
        uuid id PK
        uuid userId
        string status
    }
    GRANTS {
        uuid id PK
        uuid userId
        string targetTenantSlug
        string status
    }
```

---

## 4. Live data path — ESP32 reading to browser

```mermaid
sequenceDiagram
    autonumber
    participant ESP as ESP32
    participant Brk as MQTT Broker
    participant Ing as Ingest Worker
    participant DJ as DeviceJwtService
    participant Rd as ReadingsService
    participant DB as Tenant DB
    participant Al as AlertsService
    participant St as ReadingsStreamService
    participant SSE as SSE Endpoint
    participant UI as Browser

    ESP->>Brk: publish<br/>topic=tenants/enit/stations/<uuid>/readings<br/>body={token, reading}
    Brk->>Ing: deliver (QoS 1)
    Ing->>Ing: parse topic → tenantSlug, stationId
    Ing->>DJ: verify(token)
    DJ-->>Ing: claims
    Note over Ing: assert claims.tenantSlug == topic.tenantSlug<br/>assert claims.stationId == topic.stationId
    Ing->>Ing: class-validator on reading dto
    Ing->>Rd: ingest(tenantSlug, dto)
    Rd->>DB: INSERT INTO readings
    DB-->>Rd: persisted row
    par Side-effects (fire-and-forget)
        Rd->>Al: evaluateAndPublish(reading)
        Al->>Al: check threshold rules
        Al-->>DB: INSERT INTO alerts (per breach)
        Al->>St: stream.publish(alert)
    and
        Rd->>St: stream.publish(reading)
    end
    St-->>SSE: Subject.next()
    SSE-->>UI: data: {reading}
    Note over UI: react-query observer applies update
```

---

## 5. Ingest worker — message validation pipeline

```mermaid
flowchart TB
    Msg["MQTT message<br/>(topic, payload)"]
    Topic{"Topic matches<br/>tenants/+/stations/+/readings?"}
    JSON{"Body parses as JSON?"}
    Shape{"Has token + reading?"}
    JWT{"JWT signature valid?<br/>not expired?"}
    Tenant{"claims.tenantSlug<br/>== topic.tenantSlug?"}
    Station{"claims.stationId<br/>== topic.stationId?"}
    DTO{"reading passes<br/>class-validator?"}
    Ingest["ReadingsService.ingest()"]
    Drop1["DROP · topic_mismatch"]
    Drop2["DROP · invalid_json"]
    Drop3["DROP · missing_fields"]
    Drop4["DROP · invalid_device_token"]
    Drop5["DROP · cross_tenant_denied"]
    Drop6["DROP · cross_station_denied"]
    Drop7["DROP · invalid_reading"]

    Msg --> Topic
    Topic -- no --> Drop1
    Topic -- yes --> JSON
    JSON -- no --> Drop2
    JSON -- yes --> Shape
    Shape -- no --> Drop3
    Shape -- yes --> JWT
    JWT -- no --> Drop4
    JWT -- yes --> Tenant
    Tenant -- no --> Drop5
    Tenant -- yes --> Station
    Station -- no --> Drop6
    Station -- yes --> DTO
    DTO -- no --> Drop7
    DTO -- yes --> Ingest
```

---

## 6. SSE fan-out

```mermaid
flowchart LR
    subgraph Producers
        Mqtt["Ingest worker"]
        Http["POST /readings"]
    end

    Svc["ReadingsService.ingest()"]
    Stream{"ReadingsStreamService"}

    subgraph Channels["Channel map · key = tenant:station"]
        Ch1["Subject · enit:rooftop-A"]
        Ch2["Subject · enit:rooftop-B"]
        Ch3["Subject · esprit:quad"]
    end

    subgraph Subscribers["Active EventSource connections"]
        S1["Browser · live page"]
        S2["Browser · dashboard"]
        S3["Researcher SDK · /v1/readings/stream"]
    end

    Mqtt --> Svc
    Http --> Svc
    Svc -- "publish(reading)" --> Stream
    Stream --> Ch1 & Ch2 & Ch3
    Ch1 --> S1 & S2
    Ch3 --> S3
```

---

## 7. HTTP request lifecycle through NestJS

```mermaid
flowchart TB
    Req["HTTP request"]

    subgraph Middleware["Middleware chain"]
        RL["RequestLoggerMiddleware<br/>stamp tid · start clock"]
        TC["TenantContextMiddleware<br/>resolve req.tenant"]
    end

    subgraph Guards["Guards · route-dependent"]
        JWT["JwtAuthGuard<br/>(/auth, /readings, ...)"]
        TG["TokenAuthGuard<br/>(/v1/*)<br/>+ scope check"]
    end

    subgraph Interceptors["Global interceptors"]
        Rate["RateLimitInterceptor<br/>token-bucket"]
        LogI["RequestLogInterceptor<br/>queue audit insert"]
    end

    Pipe["Validation Pipe<br/>class-validator on DTO"]
    Handler["Controller handler"]
    Resp["Response builder"]

    subgraph Tail["Response tail"]
        WriteLog["Emit JSON log line<br/>{tid, method, path, status, ms, tenant, userId, tokenId}"]
        Out["Send response<br/>+ X-Request-Id<br/>+ X-RateLimit-*"]
    end

    Req --> RL --> TC --> JWT
    TC --> TG
    JWT --> Rate
    TG --> Rate
    Rate --> LogI --> Pipe --> Handler --> Resp --> WriteLog --> Out
```

---

## 8. Auth flow A — Operator JWT session

```mermaid
sequenceDiagram
    autonumber
    participant U as Browser
    participant API as AuthController
    participant DB as Tenant DB
    participant JWT as JwtService

    U->>API: POST /auth/login<br/>{email, password}
    API->>DB: SELECT * FROM users WHERE email=$1
    DB-->>API: user row + passwordHash
    API->>API: bcrypt.compare()
    alt mismatch
        API-->>U: 401 invalid_credentials
    else match
        API->>JWT: sign({sub, email, tenant, role})
        JWT-->>API: token (24h)
        API->>DB: UPDATE users SET lastLoginAt = now()
        API-->>U: {user, token, expiresIn}
        Note over U: localStorage["weather_station_auth_token"] = token
    end

    rect rgb(245,245,245)
        Note over U,API: Subsequent requests
        U->>API: GET /readings/latest<br/>Authorization: Bearer <jwt>
        API->>JWT: verify
        JWT-->>API: payload
        API->>DB: SELECT user WHERE id = payload.sub
        API-->>U: 200 + data
    end
```

---

## 9. Auth flow B — API token (Researcher)

```mermaid
sequenceDiagram
    autonumber
    participant U as Operator UI<br/>(JWT-authed)
    participant Tok as TokensController
    participant DB as Tenant DB

    U->>Tok: POST /v1/tokens<br/>{name, scope, expiry}
    Tok->>Tok: generate plaintext wh_rsa_xxx…
    Tok->>Tok: sha256(plaintext)
    Tok->>DB: INSERT api_tokens<br/>{hashedToken, suffix, scope, expiresAt}
    Tok-->>U: {token, plaintext}
    Note over U: Plaintext shown ONCE.<br/>Stored in localStorage as<br/>"wh.research.activeApiToken"

    rect rgb(245,245,245)
        Note over U,DB: Subsequent /v1/* requests
        participant TG as TokenAuthGuard
        U->>TG: GET /v1/readings<br/>Authorization: Bearer wh_rsa_…
        TG->>TG: sha256(plaintext)
        TG->>DB: SELECT api_tokens<br/>WHERE hashedToken=$1
        DB-->>TG: token row
        TG->>TG: check status, expiry, scope
        alt expired
            TG->>DB: UPDATE status = 'expired'
            TG-->>U: 401 token_expired
        else valid
            TG->>DB: UPDATE lastUsedAt,<br/>requestsTotal++<br/>(fire-and-forget)
            TG-->>U: 200 + scoped payload
        end
    end
```

---

## 10. Auth flow C — Device JWT (MQTT only)

```mermaid
sequenceDiagram
    autonumber
    participant Op as Operator (CLI)
    participant Script as device:provision
    participant DJ as DeviceJwtService
    participant ESP as ESP32 firmware
    participant Brk as MQTT Broker
    participant Ing as Ingest Worker

    Op->>Script: npm run device:provision<br/>--tenant=enit --station=<uuid>
    Script->>DJ: sign({tenantSlug, stationId, deviceId})
    DJ-->>Script: token (365d default)
    Script-->>Op: print token + topic
    Op->>ESP: flash firmware<br/>(token embedded)

    rect rgb(245,245,245)
        Note over ESP,Ing: Operational loop
        loop every 5 min
            ESP->>Brk: PUBLISH<br/>topic=tenants/enit/stations/<uuid>/readings<br/>body={token, reading}
            Brk->>Ing: deliver
            Ing->>DJ: verify(token)
            DJ-->>Ing: claims
            Note over Ing: assert claims match topic
            Ing->>Ing: persist via ReadingsService
        end
    end
```

---

## 11. Background workers — schedulers + queues

```mermaid
flowchart TB
    Boot["NestApplication<br/>OnApplicationBootstrap"]

    subgraph Cadence["Tick cadences"]
        TickA["5 s"]
        TickB["5 min"]
        TickC["10 min"]
        TickD["60 min"]
    end

    subgraph Workers["Background workers"]
        Exp["ExportsService Worker<br/>FOR UPDATE SKIP LOCKED"]
        Anc["AnchorScheduler<br/>Merkle batch + anchor"]
        Fc["ForecastScheduler<br/>cache pre-warm"]
        Tk["TokenSweeper<br/>expire + 90d log prune"]
    end

    subgraph Effects["Per-tenant effects"]
        Db1[("Tenant DB · enit")]
        Db2[("Tenant DB · esprit")]
        FS["exports/ on disk"]
        Hed[("Hedera HCS<br/>(stubbed)")]
    end

    Boot --> Exp & Anc & Fc & Tk
    TickA -.-> Exp
    TickB -.-> Anc
    TickC -.-> Fc
    TickD -.-> Tk

    Exp --> Db1 & Db2
    Exp --> FS
    Anc --> Db1 & Db2
    Anc -. "anchor" .-> Hed
    Fc --> Db1 & Db2
    Tk --> Db1 & Db2
```

---

## 12. Anchor + integrity verification

```mermaid
flowchart TB
    subgraph Anchor["Anchor side (every 5 min)"]
        Cron["AnchorScheduler tick"]
        Iter["For each (tenant, station)"]
        Last["SELECT MAX(timeWindowEnd)<br/>FROM integrity_batches"]
        Pull["SELECT readings<br/>WHERE recordedAt > last"]
        EmptyCheck{"any rows?"}
        Skip["skip"]
        Hash["canonical SHA-256<br/>per reading"]
        Build["Build Merkle tree<br/>(Bitcoin-style duplication)"]
        Root["Compute root"]
        AdpDecide{"HEDERA_ENABLED<br/>+ creds?"}
        Live["submitLive<br/>(SDK call)"]
        Stub["stubAnchor<br/>(deterministic)"]
        Insert[("INSERT integrity_batches")]
    end

    subgraph Verify["Verify-record side"]
        Req["POST /integrity/verify-record"]
        Find["Find batch<br/>WHERE timeWindowStart <= recordedAt <= timeWindowEnd"]
        Hash2["hashReading(current row)"]
        Leaves["Compute leaf set"]
        Proof["inclusionProof(leaves, idx)"]
        Check{"hash matches?<br/>proof reconstructs<br/>stored root?"}
        Result["{hashMatch, batchMembership,<br/>verificationMessage}"]
    end

    Cron --> Iter --> Last --> Pull --> EmptyCheck
    EmptyCheck -- no --> Skip
    EmptyCheck -- yes --> Hash --> Build --> Root --> AdpDecide
    AdpDecide -- yes --> Live
    AdpDecide -- no --> Stub
    Live -. fail .-> Stub
    Live & Stub --> Insert

    Req --> Find --> Hash2 & Leaves
    Leaves --> Proof
    Hash2 & Proof --> Check --> Result
    Insert -.-> Find
```

---

## 13. Forecast generation

```mermaid
flowchart TB
    subgraph Triggers
        Req["GET /forecasts?station=&horizon="]
        Cron["ForecastScheduler tick<br/>(every 10 min)"]
    end

    Cache{"cached forecast<br/>< 10 min old?"}
    Return["return cached row"]
    Read[("SELECT readings<br/>WHERE recordedAt >= now() - 6h")]
    Per["For each metric"]
    RainSplit{"metric = rainfall?"}
    Mean["recent-mean projection"]
    Fit["Ordinary least-squares<br/>y = a + b·t"]
    Conf["confidence = R²·65 + 30<br/>(clamped 30–95)"]
    Decay["decay 25% across horizon"]
    Upsert[("UPSERT forecasts<br/>BY (stationId, horizon)")]

    Req --> Cache
    Cache -- yes --> Return
    Cache -- no --> Read
    Cron --> Read
    Read --> Per --> RainSplit
    RainSplit -- yes --> Mean
    RainSplit -- no --> Fit --> Conf --> Decay
    Mean --> Upsert
    Decay --> Upsert
    Return -.- Upsert
```

---

## 14. Export job state machine

```mermaid
stateDiagram-v2
    [*] --> queued: POST /v1/exports
    queued --> running: worker claims row (SKIP LOCKED)
    queued --> failed: cancel mutation
    running --> ready: materialise OK (file on disk)
    running --> failed: materialise error
    running --> failed: cancel mutation
    ready --> expired: lazy check past expiresAt
    ready --> [*]: DELETE (file unlinked)
    failed --> [*]: DELETE
    expired --> [*]: DELETE
```

---

## 15. Export materialiser — streaming write

```mermaid
flowchart TB
    Claim["Claim queued job<br/>(SKIP LOCKED, set running)"]
    Total["SELECT count(*)<br/>FROM readings WHERE ..."]
    OpenFile["createWriteStream(<br/>exports/<tenant>/<jobId>.<fmt>)"]
    Loop{"more rows?"}
    Page["SELECT ... OFFSET n LIMIT 1000"]
    Fmt["Format rows<br/>(CSV / NDJSON header on first chunk)"]
    Write["stream.write(chunk)"]
    Prog["UPDATE exports<br/>SET progressPct = ..."]
    Close["stream.end()"]
    Stat["fs.stat(file)"]
    Finish["UPDATE exports<br/>SET status='ready',<br/>recordCount, sizeBytes,<br/>expiresAt = now() + ttl"]
    Fail["UPDATE exports<br/>SET status='failed',<br/>errorMessage"]

    Claim --> Total --> OpenFile --> Loop
    Loop -- yes --> Page --> Fmt --> Write --> Prog --> Loop
    Loop -- no --> Close --> Stat --> Finish
    Write -. error .-> Fail
    Page -. error .-> Fail
```

---

## 16. Rate-limit decision

```mermaid
flowchart TB
    Req["/v1/* request after TokenAuthGuard"]
    Has{"req.apiToken set?"}
    Pass["pass through<br/>(no-op for non-token routes)"]
    Touch["touch bucket<br/>(create if missing)"]
    RollM{"now - minuteWindow ≥ 60s?"}
    RollD{"now - dayWindow ≥ 24h?"}
    ResetM["minuteCount = 0"]
    ResetD["dayCount = 0"]
    OverM{"minuteCount ≥ 60?"}
    OverD{"dayCount ≥ 10000?"}
    Reject["throw 429<br/>{reason, limit, retryAfterMs}"]
    Bump["minuteCount++<br/>dayCount++"]
    Headers["Set X-RateLimit-*"]
    Next["call next.handle()"]

    Req --> Has
    Has -- no --> Pass
    Has -- yes --> Touch --> RollM --> ResetM --> RollD --> ResetD --> OverM
    OverM -- yes --> Reject
    OverM -- no --> OverD
    OverD -- yes --> Reject
    OverD -- no --> Bump --> Headers --> Next
```

---

## 17. Observability — request → log line

```mermaid
flowchart LR
    In["HTTP request"]
    Stamp["RequestLoggerMiddleware<br/>tid = X-Request-Id<br/>OR randomUUID()"]
    Attach["req.tid = tid<br/>res.X-Request-Id = tid"]
    Clock["start = Date.now()"]
    Pipe["...full pipeline...<br/>(guards, interceptors, handler)"]
    Done["res.on('finish')"]
    Build["build JSON line:<br/>{tid, method, path, status, ms,<br/>tenant, userId, tokenId}"]
    Level{"status code"}
    Info["logger.log(line)"]
    Warn["logger.warn(line)"]
    Err["logger.error(line)"]

    In --> Stamp --> Attach --> Clock --> Pipe --> Done --> Build --> Level
    Level -- "2xx / 3xx" --> Info
    Level -- "4xx" --> Warn
    Level -- "5xx" --> Err
```

---

## 18. Module dependency graph

```mermaid
flowchart TB
    subgraph CoreLayer["Core"]
        Cfg["ConfigModule"]
        Ten["TenantModule"]
        Auth["AuthModule"]
        Hlth["HealthModule"]
        Obs["ObservabilityModule"]
    end

    subgraph OpsLayer["Operations domains"]
        St["StationsModule"]
        Rd["ReadingsModule"]
        Al["AlertsModule"]
        Fc["ForecastsModule"]
        Int["IntegrityModule"]
        Dev["DeviceModule"]
    end

    subgraph ResLayer["Research domains"]
        Tk["TokensModule"]
        ResAPI["ResearchApiModule"]
        Acc["AccountModule"]
        DS["DatasetsModule"]
        Exp["ExportsModule"]
        Gr["GrantsModule"]
        Us["UsageModule"]
    end

    subgraph InfraLayer["Infra / cross-cutting"]
        Ing["IngestModule"]
        Rate["RateLimitModule"]
        Sch["SchedulersModule"]
    end

    Auth --> Ten
    St & Rd & Al & Fc & Int --> Ten
    St & Rd & Al & Fc & Int --> Auth
    Dev --> Rd
    Al --> Rd
    Rd --> Al

    Tk & Acc & DS & Exp & Gr & Us --> Ten
    Tk & Acc & DS & Exp & Gr & Us --> Auth
    ResAPI --> St & Rd & Al & Fc & Int & Tk

    Ing --> Rd
    Sch --> St & Fc & Int & Ten
    Us --> Ten
    Rate -. global .- ResAPI
    Obs -. global .- Auth
```

---

## 19. User journey — Operator daily routine

```mermaid
journey
    title Operator monitoring a campus
    section Morning
      Visit /login: 5: Operator
      Submit credentials: 4: Operator
      JWT issued, redirect /dashboard: 5: System
    section Live
      Dashboard SSE subscribes: 5: System
      Readings stream in every 5 min: 5: System
      Threshold breach fires alert: 4: System
      Operator acknowledges on /alerts: 4: Operator
    section Drill-down
      Open /analytics: 4: Operator
      Pick station + range: 4: Operator
      Trend chart renders: 5: System
    section Trust
      Open /integrity: 4: Operator
      Verify last batch: 5: Operator
      Merkle proof reconstructs root: 5: System
```

---

## 20. User journey — Researcher onboarding

```mermaid
journey
    title Researcher starting a project
    section Onboarding
      Receive invite: 5: Researcher
      Login at /research: 5: Researcher
      Browse /research/docs: 4: Researcher
    section Mint
      Open /research/tokens: 5: Researcher
      Set scope (stations + metrics): 4: Researcher
      Reveal plaintext (one-time): 3: Researcher
      Copy to clipboard: 5: Researcher
    section Query
      Try /v1/readings with curl: 5: Researcher
      Tune in /research/playground: 5: Researcher
      Save dataset: 4: Researcher
    section Bulk
      Queue export job: 4: Researcher
      Poll status (queued → running → ready): 3: System
      Download materialised file: 5: Researcher
    section Cross-tenant
      Request grant from ESPRIT: 3: Researcher
      Wait for admin approval: 2: Researcher
      Token now queries cross-tenant: 5: System
```

---

## 21. User journey — ESP32 device lifecycle

```mermaid
journey
    title ESP32 station lifecycle
    section Provisioning
      Operator runs device:provision: 5: Operator
      JWT signed (365d): 5: System
      Operator flashes firmware: 4: Operator
    section First boot
      Power on: 5: Device
      Connect to wifi: 4: Device
      Connect to MQTT broker: 4: Device
    section Steady state
      Read sensors: 5: Device
      Publish to tenant topic: 5: Device
      Ingest worker verifies + persists: 5: System
      SSE pushes to dashboard: 5: System
      Anchor scheduler batches + anchors: 5: System
    section Failure modes
      Wifi drop: 2: Device
      Local buffer (up to N readings): 3: Device
      Reconnect + flush: 4: Device
      Token rotation by ops: 3: Operator
```

---

## 22. Deployment topology (target)

```mermaid
flowchart TB
    subgraph Internet
        Devs["Researchers / SDKs"]
        Ops["Operators (campus)"]
        ESP["ESP32 fleet"]
    end

    subgraph Edge["Edge gateway"]
        LB["Reverse proxy / TLS<br/>(nginx / Caddy)"]
        MQTTPublic["Mosquitto<br/>(TLS, MQTT 1883/8883)"]
    end

    subgraph App["App tier (stateless)"]
        N1["Next.js node #1"]
        N2["Next.js node #2"]
        B1["NestJS node #1"]
        B2["NestJS node #2"]
    end

    subgraph Data["Data tier (stateful)"]
        PG[("PostgreSQL + TimescaleDB<br/>master + tenants")]
        Vol[("Block storage<br/>exports/ + backups/")]
        Mirror[("Hedera mirror node<br/>(read-only)")]
    end

    Devs --> LB
    Ops --> LB
    ESP --> MQTTPublic
    LB --> N1 & N2
    LB --> B1 & B2
    MQTTPublic --> B1 & B2
    N1 & N2 -- "SSR / API proxy" --> B1 & B2
    B1 & B2 --> PG
    B1 & B2 --> Vol
    B1 & B2 -. "anchor (Phase 5.5+)" .- Mirror
```

---

## 23. Configuration surface — `WH_MODE` decision tree

```mermaid
flowchart TB
    Boot["Process boot"]
    Read["readMode()<br/>= WH_MODE env"]
    Sw{"value"}
    Prod["production"]
    Demo["demo"]
    Test["test"]

    subgraph Behaviours
        ProdBeh["Real backend required<br/>refuse default JWT secrets<br/>no mock fallback in services<br/>MQTT worker enabled<br/>Schedulers enabled"]
        DemoBeh["Real backend preferred<br/>mock fallback on failure<br/>MQTT worker enabled<br/>Schedulers enabled"]
        TestBeh["No network<br/>mocks only<br/>MQTT worker disabled<br/>Schedulers disabled<br/>mockDataDelay = 0"]
    end

    Boot --> Read --> Sw
    Sw -- production --> Prod --> ProdBeh
    Sw -- demo --> Demo --> DemoBeh
    Sw -- test --> Test --> TestBeh
    Sw -- "unknown / empty" --> Demo
```

---

## 24. Live SSE channel — connection states (browser side)

```mermaid
stateDiagram-v2
    [*] --> opening: new EventSource(url)
    opening --> open: onopen
    opening --> error: TCP fail / 4xx
    open --> open: message
    open --> closed: server end
    open --> error: network drop
    error --> opening: EventSource auto-retry<br/>(default 3s)
    closed --> [*]
```

---

## 25. End-to-end timing budget — reading freshness

```mermaid
gantt
    title One reading · ESP32 to UI
    dateFormat  X
    axisFormat  %S s
    section Device
    Sensor read + JSON encode    :a1, 0, 50
    MQTT publish (QoS 1)         :a2, after a1, 80
    section Broker
    Broker enqueue + ACK         :b1, after a2, 20
    section Backend
    Subscribe deliver            :c1, after b1, 10
    JWT verify + claim check     :c2, after c1, 5
    DTO validate                 :c3, after c2, 5
    INSERT reading               :c4, after c3, 30
    Threshold evaluate           :c5, after c4, 8
    Subject.next() fan-out       :c6, after c4, 2
    section Browser
    EventSource onmessage        :d1, after c6, 15
    React-query observer + paint :d2, after d1, 40
```
