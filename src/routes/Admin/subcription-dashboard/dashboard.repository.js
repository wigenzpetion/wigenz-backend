// referentiel (SQL)
const db = require('../../../config/db');

exports.countByPhase = async (phase) => {
  const result = await db.query(
    "SELECT COUNT(*) FROM driver_subscriptions WHERE phase = $1",
    [phase]
  );
  return Number(result.rows[0].count);
};

exports.findSubscriptions = async (phase, startDate, endDate) => {

  let query = `
    SELECT d.id, d.name, d.email,
           ds.phase,
           ds.retry_count,
           ds.grace_period_until,
           ds.next_billing_date,
           ds.created_at
    FROM driver_subscriptions ds
    JOIN drivers d ON d.id = ds.driver_id
    WHERE 1=1
  `;

  const values = [];

  if (phase) {
    values.push(phase);
    query += ` AND ds.phase = $${values.length}`;
  }

  if (startDate && endDate) {
    values.push(startDate, endDate);
    query += ` AND ds.created_at BETWEEN $${values.length-1} AND $${values.length}`;
  }

  query += ` ORDER BY ds.created_at DESC`;

  const result = await db.query(query, values);
  return result.rows;
};

exports.searchDriver = async (keyword) => {
  const result = await db.query(`
    SELECT d.id, d.name, d.email, ds.phase
    FROM drivers d
    JOIN driver_subscriptions ds ON ds.driver_id = d.id
    WHERE d.name ILIKE $1
       OR d.email ILIKE $1
  `, [`%${keyword}%`]);

  return result.rows;
};

exports.getEvolution = async () => {
  const result = await db.query(`
    SELECT DATE(created_at) as date,
           phase,
           COUNT(*) as count
    FROM driver_subscriptions
    GROUP BY DATE(created_at), phase
    ORDER BY date ASC
  `);
  return result.rows;
};
