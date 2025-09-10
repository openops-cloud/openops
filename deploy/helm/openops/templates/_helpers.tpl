{{/*
Expand the name of the chart.
*/}}
{{- define "openops.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "openops.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "openops.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "openops.labels" -}}
helm.sh/chart: {{ include "openops.chart" . }}
{{ include "openops.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "openops.selectorLabels" -}}
app.kubernetes.io/name: {{ include "openops.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Redis connection parameters
*/}}
{{- define "openops.redisHost" -}}
{{- .Values.redis.name -}}
{{- end }}

{{- define "openops.redisPort" -}}
{{- .Values.redis.service.port | toString -}}
{{- end }}

{{- define "openops.redisUrl" -}}
{{- printf "redis://%s:%s/0" (include "openops.redisHost" .) (include "openops.redisPort" .) -}}
{{- end }}

{{/*
PostgreSQL connection parameters
*/}}
{{- define "openops.postgresHost" -}}
{{- .Values.postgres.name -}}
{{- end }}

{{- define "openops.postgresPort" -}}
{{- default (.Values.postgres.service.port | toString) -}}
{{- end }}

{{/*
Service URLs
*/}}
{{- define "openops.appServiceUrl" -}}
{{- printf "http://%s" .Values.app.name -}}
{{- end }}

{{- define "openops.engineServiceUrl" -}}
{{- printf "http://%s:3005" .Values.engine.name -}}
{{- end }}

{{- define "openops.tablesServiceUrl" -}}
{{- printf "http://%s" .Values.tables.name -}}
{{- end }}

{{- define "openops.analyticsServiceUrl" -}}
{{- printf "http://%s:8088" .Values.analytics.name -}}
{{- end }}
