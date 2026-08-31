/**
 * Live Web Application Production Deployment Health & SSL Telemetry Utilities
 */

export interface LiveDeploymentHealthMetrics {
  deploymentUrl: string;
  isSslCertificateValid: boolean;
  pageLoadSpeedMs: number;
  deploymentStatus: 'HEALTHY_ONLINE' | 'SLOW_RESPONSE_WARNING' | 'UNREACHABLE_HOST';
}

/**
 * Validates live web application production deployment response time and SSL integrity.
 */
export function evaluateLiveDeploymentHealth(
  url: string,
  loadSpeedMs: number,
  isSslValid: boolean
): LiveDeploymentHealthMetrics {
  let status: LiveDeploymentHealthMetrics['deploymentStatus'] = 'HEALTHY_ONLINE';
  if (!isSslValid || loadSpeedMs > 3000) status = 'SLOW_RESPONSE_WARNING';

  return {
    deploymentUrl: url,
    isSslCertificateValid: isSslValid,
    pageLoadSpeedMs: loadSpeedMs,
    deploymentStatus: status,
  };
}
