import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, Plus, Trash2, X, Bot } from 'lucide-react';
import { getAiModels, saveAiModels } from '../services/api';
import { supabase } from '../lib/supabase';

interface AiModelSettings {
  id: string;
  enabled: boolean;
  name: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  systemPrompt: string;
  triggerPrefix: string;
  blockList: string[];
  sendType: 'all' | 'private' | 'group';
  groupWhitelist: string[];
  enableSplitSend: boolean;
  splitSendInterval: number;
  replyProbability: number;
  contextCount: number;
  atReplyEnabled: number;
}

const AiModelPage: React.FC = () => {
  const [models, setModels] = useState<AiModelSettings[]>([]);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showSaveError, setShowSaveError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [newBlockId, setNewBlockId] = useState('');
  const [newGroupId, setNewGroupId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('未登录或会话已过期');
      }

      const savedModels = await getAiModels();
      
      if (savedModels && savedModels.length > 0) {
        // 转换数据库格式为前端格式
        const convertedModels = savedModels.map(model => ({
          id: model.id,
          enabled: model.enabled,
          name: model.name,
          model: model.model,
          baseUrl: model.base_url,
          apiKey: model.api_key,
          systemPrompt: model.system_prompt,
          triggerPrefix: model.trigger_prefix,
          blockList: model.block_list,
          sendType: model.send_type,
          groupWhitelist: model.group_whitelist,
          enableSplitSend: model.enable_split_send,
          splitSendInterval: model.split_send_interval,
          replyProbability: model.reply_probability,
          contextCount: model.context_count,
          atReplyEnabled: model.at_reply_enabled !== undefined ? model.at_reply_enabled : 1
        }));
        setModels(convertedModels);
      } else {
        // 如果没有保存的配置，创建一个默认配置
        const defaultModel: AiModelSettings = {
          id: '1',
          enabled: false,
          name: '默认模型',
          model: 'gpt-3.5-turbo',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: '',
          systemPrompt: '你是一个友好的AI助手，可以帮助用户回答问题。',
          triggerPrefix: 'ai',
          blockList: ['wexin'],
          sendType: 'all',
          groupWhitelist: ['all'],
          enableSplitSend: true,
          splitSendInterval: 3000,
          replyProbability: 100,
          contextCount: 5,
          atReplyEnabled: 1
        };
        setModels([defaultModel]);
      }
    } catch (error) {
      console.error('加载模型配置失败:', error);
      setErrorMessage('加载模型配置失败');
      setShowSaveError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('未登录或会话已过期');
      }

      // 转换前端格式为数据库格式
      const modelsToSave = models.map(model => ({
        enabled: model.enabled,
        name: model.name,
        model: model.model,
        base_url: model.baseUrl,
        api_key: model.apiKey,
        system_prompt: model.systemPrompt,
        trigger_prefix: model.triggerPrefix,
        block_list: model.blockList,
        send_type: model.sendType,
        group_whitelist: model.groupWhitelist,
        enable_split_send: model.enableSplitSend,
        split_send_interval: model.splitSendInterval,
        reply_probability: model.replyProbability,
        context_count: model.contextCount,
        at_reply_enabled: model.atReplyEnabled
      }));

      await saveAiModels(modelsToSave);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      console.error('保存设置失败:', error);
      setErrorMessage('保存设置失败');
      setShowSaveError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const addNewModel = () => {
    const newModel: AiModelSettings = {
      id: Date.now().toString(),
      enabled: false,
      name: `模型 ${models.length + 1}`,
      model: 'gpt-3.5-turbo',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      systemPrompt: '你是一个友好的AI助手，可以帮助用户回答问题。',
      triggerPrefix: 'ai',
      blockList: ['wexin'],
      sendType: 'all',
      groupWhitelist: ['all'],
      enableSplitSend: true,
      splitSendInterval: 3000,
      replyProbability: 100,
      contextCount: 5,
      atReplyEnabled: 1
    };
    setModels([...models, newModel]);
  };

  const removeModel = (id: string) => {
    if (models.length <= 1) {
      setErrorMessage('至少需要保留一个模型配置');
      setShowSaveError(true);
      return;
    }
    setModels(models.filter(model => model.id !== id));
  };

  const updateModel = (id: string, updates: Partial<AiModelSettings>) => {
    setModels(models.map(model => 
      model.id === id ? { ...model, ...updates } : model
    ));
  };

  const addBlockId = (modelId: string) => {
    if (!newBlockId.trim()) return;
    const model = models.find(m => m.id === modelId);
    if (model && !model.blockList.includes(newBlockId)) {
      updateModel(modelId, {
        blockList: [...model.blockList, newBlockId]
      });
    }
    setNewBlockId('');
  };

  const removeBlockId = (modelId: string, blockId: string) => {
    const model = models.find(m => m.id === modelId);
    if (model) {
      updateModel(modelId, {
        blockList: model.blockList.filter(id => id !== blockId)
      });
    }
  };

  const addGroupId = (modelId: string) => {
    if (!newGroupId.trim()) return;
    const model = models.find(m => m.id === modelId);
    if (model && !model.groupWhitelist.includes(newGroupId)) {
      updateModel(modelId, {
        groupWhitelist: [...model.groupWhitelist, newGroupId]
      });
    }
    setNewGroupId('');
  };

  const removeGroupId = (modelId: string, groupId: string) => {
    const model = models.find(m => m.id === modelId);
    if (model) {
      updateModel(modelId, {
        groupWhitelist: model.groupWhitelist.filter(id => id !== groupId)
      });
    }
  };

  return (
    <div className="min-h-[80vh] py-6 px-2 md:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-2 rounded bg-gradient-to-b from-blue-500 to-purple-400 mr-2" />
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <Bot className="text-blue-500" size={20} />
          AI大模型配置
        </h1>
      </div>
      <p className="text-gray-500 mb-8 ml-4">配置多个AI模型并设置触发前缀</p>

      {isLoading && (
        <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-xl flex items-center shadow animate-fade-in">
          <AlertTriangle size={22} className="mr-2 text-blue-400" />
          <span>正在加载配置...</span>
        </div>
      )}
      {showSaveSuccess && (
        <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-xl flex items-center shadow animate-fade-in">
          <AlertTriangle size={22} className="mr-2 text-green-500" />
          <span>设置已成功保存</span>
        </div>
      )}
      {showSaveError && (
        <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-xl flex items-center shadow animate-fade-in">
          <AlertTriangle size={22} className="mr-2 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border-l-4 border-blue-400 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-blue-700 flex items-center gap-2">模型配置</h2>
            <button
              type="button"
              onClick={addNewModel}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-400 text-white rounded-xl font-bold shadow-md hover:scale-105 hover:shadow-xl transition-all flex items-center gap-1"
            >
              <Plus size={20} />
              添加模型
            </button>
          </div>
          <div className="p-6 space-y-10">
            {models.map((model, index) => (
              <div key={model.id} className="border border-gray-100 rounded-xl p-6 space-y-6 shadow-sm bg-gradient-to-br from-blue-50/30 to-white/80">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold text-blue-700 flex items-center gap-2">{model.name}</h3>
                  {models.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeModel(model.id)}
                      className="text-red-500 hover:text-red-700 hover:scale-125 transition-all"
                      title="删除模型"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={model.enabled}
                      onChange={(e) => updateModel(model.id, { enabled: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">启用此模型</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={model.atReplyEnabled === 1}
                      onChange={e => updateModel(model.id, { atReplyEnabled: e.target.checked ? 1 : 0 })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">艾特回复</span>
                  </label>
                  <span className="text-xs text-gray-400">开启后，群聊@机器人时才会触发AI回复</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">模型名称</label>
                    <input
                      type="text"
                      value={model.name}
                      onChange={(e) => updateModel(model.id, { name: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      placeholder="例如: GPT-3.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">API基础地址</label>
                    <input
                      type="text"
                      value={model.baseUrl}
                      onChange={(e) => updateModel(model.id, { baseUrl: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      placeholder="例如: https://api.openai.com/v1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">模型标识符</label>
                    <input
                      type="text"
                      value={model.model}
                      onChange={(e) => updateModel(model.id, { model: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      placeholder="例如: gpt-3.5-turbo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">触发前缀</label>
                    <input
                      type="text"
                      value={model.triggerPrefix}
                      onChange={(e) => updateModel(model.id, { triggerPrefix: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      placeholder="例如: ai"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">API密钥</label>
                    <input
                      type="password"
                      value={model.apiKey}
                      onChange={(e) => updateModel(model.id, { apiKey: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      placeholder="输入您的API密钥"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">系统提示词</label>
                    <textarea
                      value={model.systemPrompt}
                      onChange={(e) => updateModel(model.id, { systemPrompt: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      rows={4}
                      placeholder="设置AI助手的角色和行为"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <details className="text-sm text-gray-600">
                    <summary className="cursor-pointer hover:text-gray-800">可用的系统提示词参数</summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <div className="mb-3">
                        <h4 className="font-medium text-gray-800 mb-1">时间相关：</h4>
                        <ul className="space-y-1">
                          <li><code>[time]</code> - 当前完整时间（如：2024/3/15 14:30:45）</li>
                          <li><code>[date]</code> - 当前日期（如：2024/3/15）</li>
                          <li><code>[year]</code> - 当前年份</li>
                          <li><code>[month]</code> - 当前月份</li>
                          <li><code>[day]</code> - 当前日期</li>
                          <li><code>[hour]</code> - 当前小时</li>
                          <li><code>[minute]</code> - 当前分钟</li>
                          <li><code>[second]</code> - 当前秒数</li>
                        </ul>
                      </div>
                      <div className="mb-3">
                        <h4 className="font-medium text-gray-800 mb-1">用户相关：</h4>
                        <ul className="space-y-1">
                          <li><code>[发送人id]</code> - 发送消息的用户ID或群号</li>
                          <li><code>[发送人昵称]</code> - 发送消息的用户昵称</li>
                          <li><code>[群号]</code> - 如果是群消息则显示群号，否则为空</li>
                          <li><code>[消息类型]</code> - 显示"群聊"或"私聊"</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800 mb-1">模型相关：</h4>
                        <ul className="space-y-1">
                          <li><code>[触发前缀]</code> - 当前模型的触发前缀</li>
                          <li><code>[模型名称]</code> - 当前模型的名称</li>
                        </ul>
                      </div>
                      <div className="mt-3 p-2 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-800">使用示例：</p>
                        <pre className="mt-1 text-xs text-blue-900 bg-white p-2 rounded">
                          {`你是一个AI助手，当前时间是[time]，当前用户是[发送人昵称]（ID：[发送人id]），这是一个[消息类型]消息。请用[触发前缀]作为触发词来调用我。`}
                        </pre>
                      </div>
                    </div>
                  </details>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">全局屏蔽名单</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newBlockId}
                        onChange={(e) => setNewBlockId(e.target.value)}
                        className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        placeholder="输入要屏蔽的用户ID"
                      />
                      <button
                        type="button"
                        onClick={() => addBlockId(model.id)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-400 text-white rounded-lg font-bold shadow hover:scale-105 transition-all"
                      >
                        添加
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {model.blockList.map((id) => (
                        <div
                          key={id}
                          className="flex items-center bg-blue-50 px-2 py-1 rounded-lg shadow text-blue-700"
                        >
                          <span className="text-sm font-mono">{id}</span>
                          <button
                            type="button"
                            onClick={() => removeBlockId(model.id, id)}
                            className="ml-1 text-blue-400 hover:text-red-500 hover:scale-125 transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">发送类型</label>
                    <select
                      value={model.sendType}
                      onChange={(e) => updateModel(model.id, { sendType: e.target.value as 'all' | 'private' | 'group' })}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    >
                      <option value="all">全局</option>
                      <option value="private">私聊</option>
                      <option value="group">群聊</option>
                    </select>
                  </div>
                </div>
                {model.sendType === 'group' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">群聊白名单</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newGroupId}
                        onChange={(e) => setNewGroupId(e.target.value)}
                        className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        placeholder="输入群ID，例如: 21218202933@chatroom"
                      />
                      <button
                        type="button"
                        onClick={() => addGroupId(model.id)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-400 text-white rounded-lg font-bold shadow hover:scale-105 transition-all"
                      >
                        添加
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {model.groupWhitelist.map((id) => (
                        <div
                          key={id}
                          className="flex items-center bg-green-50 px-2 py-1 rounded-lg shadow text-green-700"
                        >
                          <span className="text-sm font-mono">{id}</span>
                          <button
                            type="button"
                            onClick={() => removeGroupId(model.id, id)}
                            className="ml-1 text-green-400 hover:text-red-500 hover:scale-125 transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={model.enableSplitSend}
                      onChange={(e) => updateModel(model.id, { enableSplitSend: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">启用分段发送</span>
                  </label>
                  {model.enableSplitSend && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">分段发送间隔（毫秒）</label>
                      <input
                        type="number"
                        value={model.splitSendInterval}
                        onChange={(e) => updateModel(model.id, { splitSendInterval: parseInt(e.target.value) })}
                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        min="100"
                        step="100"
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">回复概率（%）</label>
                    <input
                      type="range"
                      value={model.replyProbability}
                      onChange={(e) => updateModel(model.id, { replyProbability: parseInt(e.target.value) })}
                      className="w-full accent-blue-500"
                      min="1"
                      max="100"
                    />
                    <div className="text-center text-sm text-blue-600 font-bold">{model.replyProbability}%</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">携带聊天记录条数</label>
                    <input
                      type="number"
                      value={model.contextCount}
                      onChange={(e) => updateModel(model.id, { contextCount: parseInt(e.target.value) })}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      min="0"
                      max="20"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-500 text-white rounded-xl font-bold text-lg shadow-md hover:scale-105 hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Save size={22} />
              保存设置
            </button>
          </div>
        </form>
      </div>
      <div className="mt-8 bg-white rounded-2xl shadow-xl border-l-4 border-blue-400 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-gray-100">
          <h2 className="font-bold text-blue-700 flex items-center gap-2">使用说明</h2>
        </div>
        <div className="p-6">
          <div className="prose max-w-none">
            <h3 className="text-lg font-medium text-gray-900 mb-4">参数说明</h3>
            <ul className="space-y-2 text-gray-600">
              <li><strong>模型名称：</strong>用于标识不同的AI模型配置。</li>
              <li><strong>API基础地址：</strong>API服务器的基础URL地址，用于自定义API端点。</li>
              <li><strong>模型标识符：</strong>要使用的AI模型标识符，例如gpt-3.5-turbo或自定义模型名称。</li>
              <li><strong>触发前缀：</strong>用户发送消息时需要包含的前缀，用于触发AI回复。</li>
              <li><strong>全局屏蔽名单：</strong>不回复的用户ID列表，默认包含wexin。</li>
              <li><strong>发送类型：</strong>选择AI回复的范围，可选全局、私聊或群聊。</li>
              <li><strong>群聊白名单：</strong>当发送类型为群聊时，指定允许回复的群ID列表。</li>
              <li><strong>分段发送：</strong>将回复内容按句号分段发送，模拟人工打字效果。</li>
              <li><strong>分段发送间隔：</strong>控制分段发送的时间间隔，单位为毫秒。</li>
              <li><strong>回复概率：</strong>控制AI回复的概率，范围1-100%。</li>
              <li><strong>携带聊天记录条数：</strong>发送给AI模型的上下文消息数量。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiModelPage;