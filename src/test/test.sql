SELECT
    jobid,
    status,
    cause_id,
    create_time
FROM
    fv_video_creation a
WHERE
    video_project_id = 5
    AND team_id = 45623
    AND is_del = 0
    AND a.create_time >= (CURRENT_DATE() - INTERVAL 2 DAY)