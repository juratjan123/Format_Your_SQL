SELECT
    a.user_id,
    b.user_name,
    COUNT(DISTINCT c.order_id) as total_orders,
    SUM(c.order_amount) as total_amount,
    AVG(c.order_amount) as avg_amount,
    MAX(c.order_time) as last_order_time
FROM 
    user_activity a
    INNER JOIN user_profile b ON a.user_id = b.user_id
    LEFT JOIN orders c ON a.user_id = c.user_id
WHERE
    a.activity_date BETWEEN '2023-01-01' AND '2023-12-31'
    AND b.status = 'active'
    AND (c.order_status = 'completed' OR c.order_status = 'processing')
GROUP BY
    a.user_id, b.user_name
HAVING
    COUNT(DISTINCT c.order_id) > 5
    AND SUM(c.order_amount) > 1000
ORDER BY
    total_amount DESC
LIMIT 100;