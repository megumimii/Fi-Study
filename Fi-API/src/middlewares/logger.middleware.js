const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });

/**
 * Basic request logger middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const userIdentifier = req.user?.uid || 'anonymous';
    const logLine = `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} - ${duration}ms - User: ${userIdentifier} - IP: ${ip}\n`;

    if (process.env.NODE_ENV !== 'test') {
      console.log(`${method} ${originalUrl} ${statusCode} [${duration}ms]`);
    }

    try {
      accessLogStream.write(logLine);
    } catch (e) {
      console.error('Failed to write to access log:', e.message);
    }
  });

  next();
};

/**
 * Audit logger for mutating CUD actions (POST, PUT, PATCH, DELETE)
 */
const cudAuditLogger = (req, res, next) => {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutatingMethods.includes(req.method)) {
    return next();
  }

  res.on('finish', () => {
    // Only log successful CUD operations (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const auditEntry = {
        timestamp: new Date().toISOString(),
        userUid: req.user?.uid || 'anonymous',
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode
      };

      const auditLine = `${JSON.stringify(auditEntry)}\n`;
      const auditLogPath = path.join(logsDir, 'audit.log');
      fs.appendFile(auditLogPath, auditLine, (err) => {
        if (err) console.error('Error writing audit log:', err.message);
      });
    }
  });

  next();
};

module.exports = {
  requestLogger,
  cudAuditLogger
};
