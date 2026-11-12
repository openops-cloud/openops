# blocks-optscale

OpenOps integration for [OptScale](https://github.com/hystax/optscale), the open-source FinOps and cloud cost management platform. Works with the hosted OptScale (`https://my.optscale.com`) and with self-hosted installations.

## Connection

| Field        | Description                                                 |
| ------------ | ----------------------------------------------------------- |
| OptScale URL | The OptScale host, for example `https://my.optscale.com`    |
| Email        | The email of an OptScale user that signs in with a password |
| Password     | The user's password                                         |

OptScale has no API keys, so the block signs in with `POST /auth/v2/tokens` and sends the token as a bearer token. SSO-only users can't be used. Read actions need the Member role. Dismissing recommendations and assigning resources need the Engineer role. Setting pool budgets needs the Manager role.

## Actions

| Action                              | OptScale API                                       | Write |
| ----------------------------------- | -------------------------------------------------- | ----- |
| Get Organizations                   | `GET /organizations`                               |       |
| Get Data Sources                    | `GET /organizations/{id}/cloud_accounts`           |       |
| Get Recommendations                 | `GET /organizations/{id}/optimizations`            |       |
| Get Resource Details                | `GET /cloud_resources/{id}`                        |       |
| Get Resource Expenses               | `GET /organizations/{id}/clean_expenses`           |       |
| Get Expenses Breakdown              | `GET /organizations/{id}/breakdown_expenses`       |       |
| Get Anomalies and Policy Violations | `GET /organizations/{id}/organization_constraints` |       |
| Get Pools                           | `GET /pools/{root pool id}`                        |       |
| Get Employees                       | `GET /organizations/{id}/employees`                |       |
| Dismiss or Activate Recommendation  | `PATCH /resources/{id}/optimizations`              | Yes   |
| Assign Resource Owner               | `POST /organizations/{id}/assignments/bulk`        | Yes   |
| Set Pool Budget                     | `PATCH /pools/{id}`                                | Yes   |
| Custom OptScale API Call            | Any `/restapi/v2` endpoint                         | Yes   |

Get Recommendations returns a flat list, sorted by monthly saving. Each item adds `recommendationType`, `category` (`cost` or `security`) and the organization `currency` to OptScale's own fields.

## Building

Run `nx build blocks-optscale` to build the library.

## Running unit tests

Run `nx test blocks-optscale` to execute the unit tests via [Jest](https://jestjs.io).
