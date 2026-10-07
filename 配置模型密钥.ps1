$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$form=New-Object System.Windows.Forms.Form
$form.Text='Myself 0.2 · 模型连接配置'
$form.Size=New-Object System.Drawing.Size(570,355)
$form.StartPosition='CenterScreen'
$form.FormBorderStyle='FixedDialog'
$form.MaximizeBox=$false
$labels=@('API 地址（Base URL）','模型名称','API Key（仅在本机加密保存）')
$boxes=@()
for($i=0;$i -lt 3;$i++){
 $label=New-Object System.Windows.Forms.Label
 $label.Text=$labels[$i];$label.Location=New-Object System.Drawing.Point(20,(20+$i*72));$label.Size=New-Object System.Drawing.Size(510,22);$form.Controls.Add($label)
 $box=New-Object System.Windows.Forms.TextBox
 $box.Location=New-Object System.Drawing.Point(20,(44+$i*72));$box.Size=New-Object System.Drawing.Size(510,26)
 if($i -eq 2){$box.UseSystemPasswordChar=$true}
 $boxes+=$box;$form.Controls.Add($box)
}
$boxes[0].Text='https://api.deepseek.com'
$boxes[1].Text='deepseek-flash'
$notice=New-Object System.Windows.Forms.Label
$notice.Text='密钥不会显示在聊天、网页或日志中。请仅填写购买服务的官方接口地址。'
$notice.Location=New-Object System.Drawing.Point(20,232);$notice.Size=New-Object System.Drawing.Size(510,32);$form.Controls.Add($notice)
$save=New-Object System.Windows.Forms.Button
$save.Text='加密保存';$save.Location=New-Object System.Drawing.Point(395,271);$save.Size=New-Object System.Drawing.Size(135,32);$form.Controls.Add($save)
$save.Add_Click({
 try{
  $url=$boxes[0].Text.Trim();$model=$boxes[1].Text.Trim();$key=$boxes[2].Text.Trim()
  if(!$url -or !$model -or !$key){throw '请填写 API 地址、模型名称和密钥。'}
  $parsed=[Uri]$url
  if($parsed.Scheme -ne 'https' -or !$parsed.Host -or $parsed.UserInfo){throw 'API 地址必须是有效的 HTTPS 地址。'}
  $configDir=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Myself'
  [IO.Directory]::CreateDirectory($configDir)|Out-Null
  $encrypted=ConvertFrom-SecureString (ConvertTo-SecureString $key -AsPlainText -Force)
  $config=@{baseUrl=$url.TrimEnd('/');model=$model;encryptedKey=$encrypted}
  [IO.File]::WriteAllText((Join-Path $configDir 'model-config.json'),($config|ConvertTo-Json),[Text.Encoding]::UTF8)
  $boxes[2].Clear();$key=$null
  [System.Windows.Forms.MessageBox]::Show('已在当前 Windows 账户下加密保存。请回到聊天告知“已配置”，无需发送密钥。','保存成功')|Out-Null
  $form.Close()
 }catch{[System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'未保存')|Out-Null}
})
[void]$form.ShowDialog()