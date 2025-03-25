select
    concat_ws('-',year,month,day) as dt,
    'xm' platform,
    count(distinct b.article_id) played_count,
    count(1) play_num
from dwd.dwd_base_backend_server a 
inner join articles b on a.request_map['id'] = b.article_id
join dim.dim_article c on a.request_map['id'] = c.article_id
left join dim.dim_groot_gamiel_article d on c.article_id = d.article_id
right join dim.dim_article e on d.article_id = e.article_id
cross join dim.dim_article f
where year = '2025'
and month = '03'
and request_path = '/xm2024/article'
group by concat_ws('-',year,month,day)
order by dt