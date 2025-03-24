select
    a.cp_id,e.chan_status,e.is_foster,a.video_type,
    from_unixtime(min(case when a.video_type = 'ugc' then a.create_time end), 'yyyy-MM-dd') as `竖屏首次更新时间`,
    from_unixtime(max(case when a.video_type = 'ugc' then a.create_time end), 'yyyy-MM-dd') as `竖屏最后更新时间`,
    from_unixtime(min(case when a.video_type = 'pgc' then a.create_time end), 'yyyy-MM-dd') as `横屏首次更新时间`,
    from_unixtime(max(case when a.video_type = 'pgc' then a.create_time end), 'yyyy-MM-dd') as `横屏最后更新时间`,
    sum(case when d.access_key = 'ylgdnvj5pjpw' then d.plays else 0 end) as `vivo累计vv（图文+视频）`,
    sum(case when c.access_key = 'ylwybtl8cjqp' then c.plays else 0 end) as `华为累计vv`,
    sum(case when c.access_key = 'yloflyfoftgb' then c.plays else 0 end) as `oppo累计vv`,
    sum(case when c.access_key in ('yl6k39vsshw6','yl1keovejjs9') then c.plays else 0 end) as `小米累计vv`,
    sum(case when c.access_key = 'ylsmfzg1vdvj' then c.plays else 0 end) as `小米信息流视频累计vv`,
    coalesce(f.plays, 0) as `小米信息流图文累计vv`
from dim.dim_video a
left join dim.dim_fv_category b on a.category_id=b.category_id
left join oppo_plays c on a.video_id=c.video_id
left join vivo_plays d on a.video_id=d.video_id
left join dm_cp.dm_cp_stat_sub e on a.cp_id=e.cp_id and a.video_type=e.cp_type
left join xiaomi_article_plays f on a.cp_id=f.cp_id
where a.cp_id in (
 20051328,20051328,20051328,20051328,20051328,20051328)
group by a.cp_id,coalesce(f.plays, 0),e.chan_status,e.is_foster,a.video_type