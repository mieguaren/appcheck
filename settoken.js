export default {
  async fetch(request) {
    // 常量统一管理
    const CONTENT_TYPE = { 'Content-Type': 'application/json' };
    const DEFAULT_NS = 'afk';
    const DEFAULT_CODE = '123456';
    const DEFAULT_MC = '';

    try {
      const url = new URL(request.url);
      const namespace = url.searchParams.get('namespace') || DEFAULT_NS;
      const code = url.searchParams.get('code') || DEFAULT_CODE;
      const mc = url.searchParams.get('mc') || DEFAULT_MC;

      const now = Math.floor(Date.now() / 1000);
      const edgeKV = new EdgeKV({ namespace });
      const rawData = await edgeKV.get(code);
	  
	  
      // KV 不存在
      if (rawData == null) {
        return new Response(JSON.stringify({ result: "fail", keyValue: "" }), { headers: CONTENT_TYPE });
      }

      // 解析数据
      const value = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    
      // 过期直接删除并返回失败
      if (value.exptime !== 0 && value.exptime < now) {
        await edgeKV.delete(code);
        return new Response(JSON.stringify({ result: "fail", keyValue: "" }), { headers: CONTENT_TYPE });
      }

      // 计算新过期时间
      const ddtime = Number(value.exptime) === 0 || Number(value.exptime) < now ? now : Number(value.exptime);
      const timeNum = Number(value.time);
	  const mcValue = value.mc?.trim() || mc;

	
      // 构建新值（自动带上 mc）
      const updatedValue = {
        valid: 1,
        time: 0,
        exptime: ddtime + timeNum,
        mc: mcValue  // 强制写入设备码
      };

      // ===== 核心修复：满足条件时，必须写入 mc =====
      if (value.time === 0 && value.exptime > now) {
        // 只要 valid=1 并且 mc 匹配/为空，就更新并返回成功
        if (value.valid === 1) {
          // 无论 mc 是否为空，只要传了 mc，就强制写入
          await edgeKV.put(code, JSON.stringify(updatedValue));
          return new Response(JSON.stringify({ result: "success", keyValue: updatedValue }), { headers: CONTENT_TYPE });
        } else {
          return new Response(JSON.stringify({ result: "fail", keyValue: value }), { headers: CONTENT_TYPE });
        }
      }

      // 常规更新流程
      await edgeKV.put(code, JSON.stringify(updatedValue));
      return new Response(JSON.stringify({ result: "success", keyValue: updatedValue }), { headers: CONTENT_TYPE });

    } catch (e) {
      console.error("Error:", e);
      return new Response(JSON.stringify({ result: "fail", keyValue: "" }), { headers: { 'Content-Type': 'application/json' } });
    }
  }
};