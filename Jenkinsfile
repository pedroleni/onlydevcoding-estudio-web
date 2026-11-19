// CI en Jenkins: el mismo trabajo que .github/workflows/ci.yml y security-scan.yml.
pipeline {
    agent {
        docker {
            // Node 22, como en GitHub (allí `node-version: 22`), con versión fija.
            image 'node:22.23.5-bookworm'
        }
    }

    options {
        timeout(time: 20, unit: 'MINUTES')
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        CI = 'true'
        NEXT_TELEMETRY_DISABLED = '1'
    }

    stages {
        // Va primero, con el árbol recién clonado (como el job aparte de GitHub).
        // Si falla, el build queda en FAILURE pero las demás etapas se ejecutan.
        stage('Seguridad') {
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    sh '''#!/usr/bin/env bash
                        set -uo pipefail
                        # Los logs se guardan fuera del árbol para que ningún escáner los lea.
                        logs="${WORKSPACE_TMP}/security-scan"
                        rm -rf "$logs" informes-seguridad
                        mkdir -p "$logs"
                        fail=0
                        for scanner in scripts/security/scan_*.sh; do
                            name="$(basename "$scanner" .sh)"
                            echo "== $name"
                            if ! bash "$scanner" . | tee "$logs/${name}.log"; then
                                fail=1
                            fi
                        done
                        cp -r "$logs" informes-seguridad
                        if [ "$fail" -ne 0 ]; then
                            echo "Los scanners han encontrado hallazgos bloqueantes."
                            exit 1
                        fi
                    '''
                    // Tests de contrato de los scanners.
                    sh '''#!/usr/bin/env bash
                        set -euo pipefail
                        for test in scripts/security/test_*.sh; do
                            bash "$test"
                        done
                    '''
                }
            }
        }

        stage('Instalar dependencias') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Tests') {
            steps {
                sh 'npm test -- --run'
            }
        }

        // Puerta automática de clean code (docs/clean-code.md), la misma que en GitHub.
        stage('Clean code') {
            steps {
                sh 'npm run clean-code'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'informes-seguridad/*.log', allowEmptyArchive: true
            echo "Resultado: ${currentBuild.currentResult}"
        }
        cleanup {
            deleteDir()
        }
    }
}
