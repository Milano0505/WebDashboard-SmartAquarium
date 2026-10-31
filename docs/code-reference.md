<!-- markdownlint-disable MD024 -->

# Code Reference

Penjelasan isi dan kegunaan setiap file di sistem ini, dibagi menjadi Backend, Frontend, Device, dan Database. Tiap file dijelaskan dalam beberapa paragraf, lalu diikuti daftar fungsi dan modul di dalamnya beserta kegunaannya masing-masing.

Cara mencari: tekan Ctrl+F lalu ketik nama file, fungsi, atau komponen. Setiap judul memakai nama persis seperti di kode, dan baris di bawahnya berisi link ke file dan nomor baris sumbernya. Nomor baris sesuai kode saat dokumen ini dibuat, jadi bisa bergeser jika kode berubah.

Bagian Database dijelaskan paling rinci untuk query: setiap query punya tujuan, cara kerja langkah demi langkah, hasil, dan SQL aslinya, serta shortcut ke penjelasan kodenya di bagian lain pada file ini.

## Istilah Singkat

Dokumen ini ditulis agar bisa dibaca orang yang tidak biasa membaca kode. Berikut arti beberapa istilah yang sering muncul.

* **Frontend:** tampilan web yang dilihat dan dipakai pengguna di browser.
* **Backend:** program di server yang menerima permintaan dari tampilan web dan dari alat, menjaga aturan, lalu membaca atau menyimpan data.
* **Device:** alat di akuarium (ESP32) yang membaca suhu dan menyalakan atau mematikan heater dan lampu.
* **Database:** tempat data disimpan secara permanen, seperti akun, pengaturan akuarium, dan riwayat suhu.
* **Fungsi:** potongan kode kecil yang mengerjakan satu tugas dan bisa dipanggil berulang kali.
* **Modul:** satu file kode yang berisi beberapa fungsi atau data yang saling berkaitan.
* **Route dan API:** alamat di backend yang bisa dipanggil oleh tampilan web atau alat untuk meminta atau mengirim data.
* **Komponen:** satu bagian tampilan, seperti tombol, kotak informasi, atau satu halaman utuh.
* **Hook:** cara bawaan React untuk menyimpan data atau menjalankan sesuatu saat tampilan berubah.
* **Telemetri:** data yang dikirim alat secara berkala, seperti suhu, status heater, dan status lampu.
* **Relay:** saklar elektronik yang dipakai alat untuk menyalakan dan mematikan heater dan lampu.
* **Watchdog:** pengawas yang menyalakan ulang alat atau memberi peringatan jika ada bagian yang macet atau alat berhenti mengirim data.
* **Tabel dan query:** tabel adalah daftar data di database, sedangkan query adalah perintah untuk membaca atau mengubah isi tabel.

## Daftar Isi

* [Backend](#backend)
    * [backend/.env.example](#backendenvexample)
    * [backend/config/default-aquarium.js](#backendconfigdefault-aquariumjs)
        * [createDefaultAquariumConfig](#createdefaultaquariumconfig)
    * [backend/index.js](#backendindexjs)
        * [cors](#cors)
        * [express.json](#expressjson)
        * [req.body ||= {}](#reqbody--)
        * [GET /api/health](#get-apihealth)
        * [app.use("/api/auth", authRoutes)](#appuseapiauth-authroutes)
        * [app.use("/api/users", userRoutes)](#appuseapiusers-userroutes)
        * [app.use("/api/admin", adminRoutes)](#appuseapiadmin-adminroutes)
        * [app.use("/api/aquariums", aquariumRoutes)](#appuseapiaquariums-aquariumroutes)
        * [app.use("/api/hardware", hardwareRoutes)](#appuseapihardware-hardwareroutes)
        * [API endpoint was not found.](#api-endpoint-was-not-found)
        * [(error, req, res, next)](#error-req-res-next)
        * [app.listen](#applisten)
    * [backend/middleware/auth.js](#backendmiddlewareauthjs)
        * [hashDeviceKey](#hashdevicekey)
        * [invalidateGlobalRole](#invalidateglobalrole)
        * [invalidateDeviceKeyCache](#invalidatedevicekeycache)
        * [loadGlobalRole](#loadglobalrole)
        * [verifyAccessToken](#verifyaccesstoken)
        * [requireUserAuth](#requireuserauth)
        * [requireAdminRole](#requireadminrole)
        * [requireDeviceKey](#requiredevicekey)
        * [requireDeviceOwnsAquarium](#requiredeviceownsaquarium)
    * [backend/package.json](#backendpackagejson)
        * [start](#start)
        * [dev](#dev)
        * [format](#format)
        * [test](#test)
    * [backend/routes/admin.js](#backendroutesadminjs)
        * [parseTrimmedName](#parsetrimmedname)
        * [GET /api/admin/users](#get-apiadminusers)
        * [PATCH /api/admin/users/:userId](#patch-apiadminusersuserid)
        * [POST /api/admin/aquariums](#post-apiadminaquariums)
        * [GET /api/admin/aquariums](#get-apiadminaquariums)
        * [PATCH /api/admin/aquariums/:aquariumId](#patch-apiadminaquariumsaquariumid)
        * [aquariumExistsById](#aquariumexistsbyid)
        * [GET /api/admin/aquariums/:aquariumId/devices](#get-apiadminaquariumsaquariumiddevices)
        * [POST /api/admin/aquariums/:aquariumId/devices](#post-apiadminaquariumsaquariumiddevices)
        * [DELETE /api/admin/devices/:deviceId](#delete-apiadmindevicesdeviceid)
    * [backend/routes/aquariums.js](#backendroutesaquariumsjs)
        * [parseLimitParam](#parselimitparam)
        * [parseDateParam](#parsedateparam)
        * [loadActorName](#loadactorname)
        * [resolveConfigFieldPath](#resolveconfigfieldpath)
        * [getValueAtPath](#getvalueatpath)
        * [describeConfigField](#describeconfigfield)
        * [describeConfigValue](#describeconfigvalue)
        * [createConfigPatchHandler](#createconfigpatchhandler)
        * [escapeCsvCell](#escapecsvcell)
        * [queryTelemetryRecords](#querytelemetryrecords)
        * [GET /api/aquariums](#get-apiaquariums)
        * [GET /api/aquariums/:aquariumId](#get-apiaquariumsaquariumid)
        * [PATCH /api/aquariums/:aquariumId/temperature-config](#patch-apiaquariumsaquariumidtemperature-config)
        * [PATCH /api/aquariums/:aquariumId/lighting-config](#patch-apiaquariumsaquariumidlighting-config)
        * [PATCH /api/aquariums/:aquariumId/feeder-config](#patch-apiaquariumsaquariumidfeeder-config)
        * [PATCH /api/aquariums/:aquariumId/system-config](#patch-apiaquariumsaquariumidsystem-config)
        * [POST /api/aquariums/:aquariumId/feeder/trigger](#post-apiaquariumsaquariumidfeedertrigger)
        * [GET /api/aquariums/:aquariumId/telemetry/export](#get-apiaquariumsaquariumidtelemetryexport)
        * [GET /api/aquariums/:aquariumId/telemetry](#get-apiaquariumsaquariumidtelemetry)
        * [GET /api/aquariums/:aquariumId/notifications](#get-apiaquariumsaquariumidnotifications)
        * [PATCH /api/aquariums/:aquariumId/notifications/read-all](#patch-apiaquariumsaquariumidnotificationsread-all)
        * [isNotificationVisibleToUser](#isnotificationvisibletouser)
        * [PATCH /api/aquariums/:aquariumId/notifications/:notificationId/read](#patch-apiaquariumsaquariumidnotificationsnotificationidread)
        * [DELETE /api/aquariums/:aquariumId/notifications/:notificationId](#delete-apiaquariumsaquariumidnotificationsnotificationid)
        * [GET /api/aquariums/:aquariumId/members](#get-apiaquariumsaquariumidmembers)
        * [GET /api/aquariums/:aquariumId/candidates](#get-apiaquariumsaquariumidcandidates)
        * [PUT /api/aquariums/:aquariumId/members](#put-apiaquariumsaquariumidmembers)
        * [DELETE /api/aquariums/:aquariumId/members/:userId](#delete-apiaquariumsaquariumidmembersuserid)
    * [backend/routes/auth.js](#backendroutesauthjs)
        * [toSessionProfile](#tosessionprofile)
        * [POST /api/auth/session](#post-apiauthsession)
        * [POST /api/auth/password-changed](#post-apiauthpassword-changed)
    * [backend/routes/hardware.js](#backendrouteshardwarejs)
        * [isOnOffState](#isonoffstate)
        * [isFeederStatusValue](#isfeederstatusvalue)
        * [formatLocalDay](#formatlocalday)
        * [isTempOutOfRange](#istempoutofrange)
        * [parseDeviceTimestamp](#parsedevicetimestamp)
        * [calculateLightingUsageDelta](#calculatelightingusagedelta)
        * [POST /api/hardware/:aquariumId/telemetry](#post-apihardwareaquariumidtelemetry)
        * [POST /api/hardware/:aquariumId/telemetry/backlog](#post-apihardwareaquariumidtelemetrybacklog)
        * [GET /api/hardware/:aquariumId/config](#get-apihardwareaquariumidconfig)
    * [backend/routes/users.js](#backendroutesusersjs)
        * [toUserProfileResponse](#touserprofileresponse)
        * [isOwnProfileRequest](#isownprofilerequest)
        * [GET /api/users/:userId](#get-apiusersuserid)
        * [PUT /api/users/:userId](#put-apiusersuserid)
    * [backend/tests/lockdown.test.js](#backendtestslockdowntestjs)
        * [supabaseLikeDatabase](#supabaselikedatabase)
        * [runAs](#runas)
        * [ada tabel di schema public yang diperiksa](#ada-tabel-di-schema-public-yang-diperiksa)
        * [${role}: semua tabel public menolak baca dan hapus](#role-semua-tabel-public-menolak-baca-dan-hapus)
        * [${role}: semua fungsi public tidak bisa dipanggil (RPC Data API)](#role-semua-fungsi-public-tidak-bisa-dipanggil-rpc-data-api)
        * [${role}: tabel dan fungsi yang ditambahkan nanti otomatis tertutup](#role-tabel-dan-fungsi-yang-ditambahkan-nanti-otomatis-tertutup)
        * [trigger pembuat profil tetap berjalan untuk Supabase Auth](#trigger-pembuat-profil-tetap-berjalan-untuk-supabase-auth)
        * [RLS tanpa policy tetap menahan walau ada GRANT yang keliru](#rls-tanpa-policy-tetap-menahan-walau-ada-grant-yang-keliru)
        * [kontrol: tanpa pencabutan hak bawaan, tabel baru memang bocor (uji ini bermakna)](#kontrol-tanpa-pencabutan-hak-bawaan-tabel-baru-memang-bocor-uji-ini-bermakna)
    * [backend/utils/access-roles.js](#backendutilsaccess-rolesjs)
        * [hasMinimumRole](#hasminimumrole)
        * [isValidAquariumId](#isvalidaquariumid)
        * [isUuid](#isuuid)
        * [highestAccessRole](#highestaccessrole)
    * [backend/utils/config-change-events.js](#backendutilsconfig-change-eventsjs)
        * [getChangeHub](#getchangehub)
        * [getConfigVersion](#getconfigversion)
        * [publishConfigChange](#publishconfigchange)
        * [waitForConfigChange](#waitforconfigchange)
    * [backend/utils/config-validation.js](#backendutilsconfig-validationjs)
        * [isPlainObject](#isplainobject)
        * [oneOfAllowed](#oneofallowed)
        * [numberInRange](#numberinrange)
        * [booleanField](#booleanfield)
        * [timeField](#timefield)
        * [validateTimezone](#validatetimezone)
        * [parseMinutesOfDay](#parseminutesofday)
        * [calculateScheduleDurationHours](#calculatescheduledurationhours)
        * [validateLightingSchedule](#validatelightingschedule)
        * [validateFeederSchedules](#validatefeederschedules)
        * [validateTemperatureThresholds](#validatetemperaturethresholds)
    * [backend/utils/device-watchdog.js](#backendutilsdevice-watchdogjs)
        * [offlineThresholdSeconds](#offlinethresholdseconds)
        * [recordTelemetryReceived](#recordtelemetryreceived)
        * [loadInitialTelemetryState](#loadinitialtelemetrystate)
        * [notifyDeviceOffline](#notifydeviceoffline)
        * [checkOfflineDevices](#checkofflinedevices)
        * [startDeviceWatchdog](#startdevicewatchdog)
    * [backend/utils/http-errors.js](#backendutilshttp-errorsjs)
        * [badRequestError](#badrequesterror)
        * [forbiddenError](#forbiddenerror)
    * [backend/utils/notification-records.js](#backendutilsnotification-recordsjs)
        * [addAquariumNotification](#addaquariumnotification)
        * [addUserNotification](#addusernotification)
    * [backend/utils/profile-photo-validation.js](#backendutilsprofile-photo-validationjs)
        * [isValidProfilePhotoUrl](#isvalidprofilephotourl)
    * [backend/utils/ttl-cache.js](#backendutilsttl-cachejs)
        * [createTtlCache](#createttlcache)
        * [get](#get)
        * [set](#set)
        * [delete](#delete)
        * [deletePrefix](#deleteprefix)
        * [clear](#clear)
        * [getOrLoad](#getorload)
* [Frontend](#frontend)
    * [frontend/.env.example](#frontendenvexample)
    * [frontend/.mise.toml](#frontendmisetoml)
    * [frontend/index.html](#frontendindexhtml)
    * [frontend/package.json](#frontendpackagejson)
        * [dev](#dev-1)
        * [build](#build)
        * [preview](#preview)
        * [format](#format-1)
    * [frontend/src/api/backendApi.js](#frontendsrcapibackendapijs)
        * [getAccessToken](#getaccesstoken)
        * [isAuthInProgress](#isauthinprogress)
        * [runWithAuthInProgress](#runwithauthinprogress)
        * [buildAquariumPath](#buildaquariumpath)
        * [buildQueryString](#buildquerystring)
        * [requestRaw](#requestraw)
        * [requestBody](#requestbody)
        * [sendJson](#sendjson)
        * [getOrFallbackOn404](#getorfallbackon404)
        * [toAuthError](#toautherror)
        * [syncBackendSession](#syncbackendsession)
        * [loginWithEmail](#loginwithemail)
        * [registerAccount](#registeraccount)
        * [changePassword](#changepassword)
        * [logoutAccount](#logoutaccount)
        * [getUserProfile](#getuserprofile)
        * [updateUserProfile](#updateuserprofile)
        * [getAquariumList](#getaquariumlist)
        * [getAquariumDetail](#getaquariumdetail)
        * [updateTemperatureConfig](#updatetemperatureconfig)
        * [updateLightingConfig](#updatelightingconfig)
        * [updateFeederConfig](#updatefeederconfig)
        * [updateSystemConfig](#updatesystemconfig)
        * [triggerFeeder](#triggerfeeder)
        * [getTelemetryRecords](#gettelemetryrecords)
        * [exportTelemetryCsv](#exporttelemetrycsv)
        * [toTemperatureChartData](#totemperaturechartdata)
        * [getNotifications](#getnotifications)
        * [markNotificationRead](#marknotificationread)
        * [markAllNotificationsRead](#markallnotificationsread)
        * [deleteNotification](#deletenotification)
        * [getAquariumMembers](#getaquariummembers)
        * [getMemberCandidates](#getmembercandidates)
        * [saveAquariumMember](#saveaquariummember)
        * [removeAquariumMember](#removeaquariummember)
        * [adminGetUsers](#admingetusers)
        * [adminSetUserRole](#adminsetuserrole)
        * [adminGetAquariums](#admingetaquariums)
        * [adminCreateAquarium](#admincreateaquarium)
        * [adminUpdateAquarium](#adminupdateaquarium)
        * [adminGetDevices](#admingetdevices)
        * [adminCreateDevice](#admincreatedevice)
        * [adminRevokeDevice](#adminrevokedevice)
    * [frontend/src/App.jsx](#frontendsrcappjsx)
        * [ProtectedRoute](#protectedroute)
        * [NoAquariumNotice](#noaquariumnotice)
        * [AppRoutes](#approutes)
        * [showSuccessNotice](#showsuccessnotice)
        * [App](#app)
    * [frontend/src/components/access/AccessUiParts.jsx](#frontendsrccomponentsaccessaccessuipartsjsx)
        * [useApiAction](#useapiaction)
        * [runApiAction](#runapiaction)
        * [SectionCard](#sectioncard)
        * [StatusMessages](#statusmessages)
        * [PersonRow](#personrow)
        * [EmptyState](#emptystate)
        * [SmallButton](#smallbutton)
    * [frontend/src/components/access/AddPersonPanel.jsx](#frontendsrccomponentsaccessaddpersonpaneljsx)
        * [AddPersonPanel](#addpersonpanel)
    * [frontend/src/components/access/AdminAccess.jsx](#frontendsrccomponentsaccessadminaccessjsx)
        * [AquariumList](#aquariumlist)
        * [AdminAccess](#adminaccess)
        * [loadAdminAquariums](#loadadminaquariums)
        * [handleAquariumDataChanged](#handleaquariumdatachanged)
        * [handleAquariumCreated](#handleaquariumcreated)
    * [frontend/src/components/access/AquariumPeople.jsx](#frontendsrccomponentsaccessaquariumpeoplejsx)
        * [AquariumPeople](#aquariumpeople)
        * [loadPeople](#loadpeople)
        * [handleAddPerson](#handleaddperson)
        * [handleRemovePerson](#handleremoveperson)
        * [renderPersonList](#renderpersonlist)
    * [frontend/src/components/access/AquariumSummary.jsx](#frontendsrccomponentsaccessaquariumsummaryjsx)
        * [AquariumSummary](#aquariumsummary)
        * [saveAquariumName](#saveaquariumname)
        * [togglePublicMonitoring](#togglepublicmonitoring)
    * [frontend/src/components/access/DevicesSection.jsx](#frontendsrccomponentsaccessdevicessectionjsx)
        * [DevicesSection](#devicessection)
        * [loadDevices](#loaddevices)
        * [handleRegisterDevice](#handleregisterdevice)
        * [handleRevokeDevice](#handlerevokedevice)
        * [copyDeviceKey](#copydevicekey)
    * [frontend/src/components/access/NewAquariumForm.jsx](#frontendsrccomponentsaccessnewaquariumformjsx)
        * [NewAquariumForm](#newaquariumform)
        * [handleCreateAquarium](#handlecreateaquarium)
    * [frontend/src/components/access/OwnerAccess.jsx](#frontendsrccomponentsaccessowneraccessjsx)
        * [OwnerAccess](#owneraccess)
    * [frontend/src/components/access/UsersTab.jsx](#frontendsrccomponentsaccessuserstabjsx)
        * [UsersTab](#userstab)
        * [loadUsers](#loadusers)
        * [toggleAdminRole](#toggleadminrole)
    * [frontend/src/components/AppLayout.jsx](#frontendsrccomponentsapplayoutjsx)
        * [UnreadBadge](#unreadbadge)
        * [AppLayout](#applayout)
        * [isNavPathActive](#isnavpathactive)
        * [handleSignOut](#handlesignout)
    * [frontend/src/components/ErrorBoundary.jsx](#frontendsrccomponentserrorboundaryjsx)
        * [ErrorBoundary](#errorboundary)
        * [getDerivedStateFromError](#getderivedstatefromerror)
        * [componentDidCatch](#componentdidcatch)
        * [render](#render)
    * [frontend/src/components/Icons.jsx](#frontendsrccomponentsiconsjsx)
        * [IconFrame](#iconframe)
        * [FishIcon](#fishicon)
        * [DashboardIcon](#dashboardicon)
        * [HistoryIcon](#historyicon)
        * [BellIcon](#bellicon)
        * [SettingsIcon](#settingsicon)
        * [LogoutIcon](#logouticon)
        * [ChevronLeftIcon](#chevronlefticon)
        * [ChevronRightIcon](#chevronrighticon)
        * [UserIcon](#usericon)
        * [MailIcon](#mailicon)
        * [LockIcon](#lockicon)
        * [CameraIcon](#cameraicon)
        * [EyeIcon](#eyeicon)
        * [EyeOffIcon](#eyeofficon)
        * [CheckIcon](#checkicon)
        * [PlusIcon](#plusicon)
        * [TrashIcon](#trashicon)
        * [DownloadIcon](#downloadicon)
        * [SearchIcon](#searchicon)
    * [frontend/src/components/RoleBadge.jsx](#frontendsrccomponentsrolebadgejsx)
        * [RoleBadge](#rolebadge)
    * [frontend/src/components/TemperatureAreaChart.jsx](#frontendsrccomponentstemperatureareachartjsx)
        * [TemperatureAreaChart](#temperatureareachart)
        * [scaleX](#scalex)
        * [scaleY](#scaley)
    * [frontend/src/components/UiKit.jsx](#frontendsrccomponentsuikitjsx)
        * [LiveClock](#liveclock)
        * [ToggleSwitch](#toggleswitch)
        * [StatusBadge](#statusbadge)
        * [InfoField](#infofield)
        * [Card](#card)
        * [PrimaryButton](#primarybutton)
        * [InputField](#inputfield)
        * [RangeSlider](#rangeslider)
        * [ModeSelector](#modeselector)
        * [ErrorAlert](#erroralert)
        * [SuccessAlert](#successalert)
        * [PageHeader](#pageheader)
        * [LoadingSpinner](#loadingspinner)
    * [frontend/src/context/AuthContext.jsx](#frontendsrccontextauthcontextjsx)
        * [isBlobUrl](#isbloburl)
        * [readStoredAquariumId](#readstoredaquariumid)
        * [storeActiveAquariumId](#storeactiveaquariumid)
        * [AuthProvider](#authprovider)
        * [loadAquariumList](#loadaquariumlist)
        * [completeSignIn](#completesignin)
        * [clearAuthState](#clearauthstate)
        * [signOut](#signout)
        * [loadSavedSession](#loadsavedsession)
        * [handleUnauthorizedEvent](#handleunauthorizedevent)
        * [selectActiveAquarium](#selectactiveaquarium)
        * [useAuth](#useauth)
    * [frontend/src/hooks/useBrowserNotifications.js](#frontendsrchooksusebrowsernotificationsjs)
        * [getNotificationPermission](#getnotificationpermission)
        * [storeBrowserNotificationPreference](#storebrowsernotificationpreference)
        * [useBrowserNotifications](#usebrowsernotifications)
        * [setBrowserNotificationsEnabled](#setbrowsernotificationsenabled)
        * [checkForNewNotifications](#checkfornewnotifications)
    * [frontend/src/hooks/useUnreadNotificationCount.js](#frontendsrchooksuseunreadnotificationcountjs)
        * [useUnreadNotificationCount](#useunreadnotificationcount)
        * [refreshUnreadCount](#refreshunreadcount)
        * [refreshWhenTabVisible](#refreshwhentabvisible)
    * [frontend/src/index.css](#frontendsrcindexcss)
    * [frontend/src/main.jsx](#frontendsrcmainjsx)
    * [frontend/src/pages/Access.jsx](#frontendsrcpagesaccessjsx)
        * [AccessPage](#accesspage)
    * [frontend/src/pages/Configuration.jsx](#frontendsrcpagesconfigurationjsx)
        * [InfoRows](#inforows)
        * [ProfileTab](#profiletab)
        * [savePhoto](#savephoto)
        * [handlePhotoSelected](#handlephotoselected)
        * [handleSaveProfile](#handlesaveprofile)
        * [handleChangePassword](#handlechangepassword)
        * [setPasswordError](#setpassworderror)
        * [handleSignOut](#handlesignout-1)
        * [SystemTab](#systemtab)
        * [getBrowserNotificationHint](#getbrowsernotificationhint)
        * [AlertsTab](#alertstab)
        * [AboutTab](#abouttab)
        * [ConfigurationPage](#configurationpage)
        * [updateAquariumSection](#updateaquariumsection)
        * [saveSettings](#savesettings)
        * [handleSaveSystemSettings](#handlesavesystemsettings)
        * [handleSaveTemperatureThresholds](#handlesavetemperaturethresholds)
        * [handleToggleBrowserNotifications](#handletogglebrowsernotifications)
        * [renderAquariumSettingsTab](#renderaquariumsettingstab)
    * [frontend/src/pages/Dashboard.jsx](#frontendsrcpagesdashboardjsx)
        * [toMinutesOfDay](#tominutesofday)
        * [calculateScheduleDurationHours](#calculatescheduledurationhours-1)
        * [formatHours](#formathours)
        * [formatModeLabel](#formatmodelabel)
        * [toTimestampMs](#totimestampms)
        * [checkDeviceOnline](#checkdeviceonline)
        * [isFeedPending](#isfeedpending)
        * [TimeSelect](#timeselect)
        * [AddFeedingTimeModal](#addfeedingtimemodal)
        * [handleAddSchedule](#handleaddschedule)
        * [DeviceOnlineBadge](#deviceonlinebadge)
        * [ManualControlPanel](#manualcontrolpanel)
        * [buttonClass](#buttonclass)
        * [OverviewTab](#overviewtab)
        * [TemperatureTab](#temperaturetab)
        * [saveTemperatureConfig](#savetemperatureconfig)
        * [saveTargetTemp](#savetargettemp)
        * [LightingScheduleCard](#lightingschedulecard)
        * [LightingTab](#lightingtab)
        * [saveLightingConfig](#savelightingconfig)
        * [FeederTab](#feedertab)
        * [saveFeedingSchedules](#savefeedingschedules)
        * [DashboardPage](#dashboardpage)
        * [refreshDashboardData](#refreshdashboarddata)
        * [runDashboardAction](#rundashboardaction)
        * [saveAquariumSection](#saveaquariumsection)
        * [handleFeedNow](#handlefeednow)
    * [frontend/src/pages/DataHistory.jsx](#frontendsrcpagesdatahistoryjsx)
        * [toDateKey](#todatekey)
        * [formatRecordDateTime](#formatrecorddatetime)
        * [formatRecordTime](#formatrecordtime)
        * [downloadTelemetryCsv](#downloadtelemetrycsv)
        * [DeviceStatusCells](#devicestatuscells)
        * [RecordList](#recordlist)
        * [HistoryTableTab](#historytabletab)
        * [handleExportCsv](#handleexportcsv)
        * [HistoryCalendarTab](#historycalendartab)
        * [changeMonth](#changemonth)
        * [DataHistoryPage](#datahistorypage)
    * [frontend/src/pages/Login.jsx](#frontendsrcpagesloginjsx)
        * [LoginPage](#loginpage)
        * [handleLoginSubmit](#handleloginsubmit)
    * [frontend/src/pages/Notifications.jsx](#frontendsrcpagesnotificationsjsx)
        * [NotificationsPage](#notificationspage)
        * [runNotificationAction](#runnotificationaction)
        * [handleMarkRead](#handlemarkread)
        * [handleMarkAllRead](#handlemarkallread)
        * [handleDeleteNotification](#handledeletenotification)
    * [frontend/src/pages/Register.jsx](#frontendsrcpagesregisterjsx)
        * [RegisterPage](#registerpage)
        * [updateFormField](#updateformfield)
        * [handleAvatarSelected](#handleavatarselected)
        * [handleRegisterSubmit](#handleregistersubmit)
    * [frontend/src/supabaseAuth.js](#frontendsrcsupabaseauthjs)
    * [frontend/src/utils/displayFormatters.js](#frontendsrcutilsdisplayformattersjs)
        * [celsiusToFahrenheit](#celsiustofahrenheit)
        * [isNumericValue](#isnumericvalue)
        * [getTemperatureUnitSymbol](#gettemperatureunitsymbol)
        * [formatTemperatureValue](#formattemperaturevalue)
        * [formatTemperature](#formattemperature)
        * [getInitials](#getinitials)
        * [formatRelativeTime](#formatrelativetime)
    * [frontend/src/utils/profilePhoto.js](#frontendsrcutilsprofilephotojs)
        * [createProfilePhotoDataUrl](#createprofilephotodataurl)
    * [frontend/vite.config.js](#frontendviteconfigjs)
* [Device](#device)
    * [device/include/README](#deviceincludereadme)
    * [device/include/secrets.example.h](#deviceincludesecretsexampleh)
    * [device/lib/README](#devicelibreadme)
    * [device/platformio.ini](#deviceplatformioini)
    * [device/src/main.cpp](#devicesrcmaincpp)
        * [DashboardConfig](#dashboardconfig)
        * [DeviceStatus](#devicestatus)
        * [BacklogReading](#backlogreading)
        * [runLocked](#runlocked)
        * [getConfigSnapshot](#getconfigsnapshot)
        * [getStatusSnapshot](#getstatussnapshot)
        * [storeConfigAndSaveToFlash](#storeconfigandsavetoflash)
        * [loadConfigFromFlash](#loadconfigfromflash)
        * [initRelayPin](#initrelaypin)
        * [setAlarmEvent](#setalarmevent)
        * [updateBuzzer](#updatebuzzer)
        * [applyTimezone](#applytimezone)
        * [getLocalMinuteOfDay](#getlocalminuteofday)
        * [getEpochSeconds](#getepochseconds)
        * [setHeaterRelay](#setheaterrelay)
        * [applyHeaterControl](#applyheatercontrol)
        * [updateTempSensorAndHeater](#updatetempsensorandheater)
        * [setLampRelay](#setlamprelay)
        * [isMinuteInSchedule](#isminuteinschedule)
        * [applyLampControl](#applylampcontrol)
        * [buildApiUrl](#buildapiurl)
        * [sendHttpRequest](#sendhttprequest)
        * [parseClockTimeToMinutes](#parseclocktimetominutes)
        * [fetchConfigFromBackend](#fetchconfigfrombackend)
        * [sendTelemetry](#sendtelemetry)
        * [isTemperatureValid](#istemperaturevalid)
        * [enqueueBacklogReading](#enqueuebacklogreading)
        * [sendBacklogBatch](#sendbacklogbatch)
        * [configLongPollTask](#configlongpolltask)
        * [telemetryTask](#telemetrytask)
        * [getResetReasonText](#getresetreasontext)
        * [getAbnormalBootReason](#getabnormalbootreason)
        * [restartIfNetworkTasksStalled](#restartifnetworktasksstalled)
        * [setup](#setup)
        * [loop](#loop)
    * [device/test/README](#devicetestreadme)
* [Database](#database)
    * [Ringkasan Database](#ringkasan-database)
    * [Peta Tabel](#peta-tabel)
        * [Tabel `profiles](#tabel-profiles)
        * [Tabel `aquariums](#tabel-aquariums)
        * [Tabel `aquarium_members](#tabel-aquarium_members)
        * [Tabel `devices](#tabel-devices)
        * [Tabel `device_state](#tabel-device_state)
        * [Tabel `telemetry_history](#tabel-telemetry_history)
        * [Tabel `lighting_usage](#tabel-lighting_usage)
        * [Tabel `notifications](#tabel-notifications)
        * [Tabel `notification_states](#tabel-notification_states)
        * [Fungsi SQL `handle_new_user](#fungsi-sql-handle_new_user)
        * [Trigger `on_auth_user_created](#trigger-on_auth_user_created)
        * [Fungsi SQL `create_device_state](#fungsi-sql-create_device_state)
        * [Trigger `on_aquarium_created](#trigger-on_aquarium_created)
        * [Keamanan `enable row level security](#keamanan-enable-row-level-security)
    * [Query backend/config/aquarium-repository.js](#query-backendconfigaquarium-repositoryjs)
        * [Query `AQUARIUM_SELECT_COLUMNS](#query-aquarium_select_columns)
        * [Query `getAquariumById](#query-getaquariumbyid)
        * [Query `findAccessibleAquarium](#query-findaccessibleaquarium)
        * [Query `getLightingAverageHours](#query-getlightingaveragehours)
        * [Query `buildAquariumResponse](#query-buildaquariumresponse)
    * [Query backend/config/database.js](#query-backendconfigdatabasejs)
        * [Query `queryDatabase](#query-querydatabase)
        * [Query `runInTransaction](#query-runintransaction)
    * [Query backend/index.js](#query-backendindexjs)
        * [Query `app.listen](#query-applisten)
    * [Query backend/middleware/auth.js](#query-backendmiddlewareauthjs)
        * [Query `loadGlobalRole](#query-loadglobalrole)
        * [Query `requireDeviceKey](#query-requiredevicekey)
    * [Query backend/routes/admin.js](#query-backendroutesadminjs)
        * [Query `GET /api/admin/users](#query-get-apiadminusers)
        * [Query `PATCH /api/admin/users/:userId](#query-patch-apiadminusersuserid)
        * [Query `POST /api/admin/aquariums](#query-post-apiadminaquariums)
        * [Query `GET /api/admin/aquariums](#query-get-apiadminaquariums)
        * [Query `PATCH /api/admin/aquariums/:aquariumId](#query-patch-apiadminaquariumsaquariumid)
        * [Query `aquariumExistsById](#query-aquariumexistsbyid)
        * [Query `GET /api/admin/aquariums/:aquariumId/devices](#query-get-apiadminaquariumsaquariumiddevices)
        * [Query `POST /api/admin/aquariums/:aquariumId/devices](#query-post-apiadminaquariumsaquariumiddevices)
        * [Query `DELETE /api/admin/devices/:deviceId](#query-delete-apiadmindevicesdeviceid)
    * [Query backend/routes/aquariums.js](#query-backendroutesaquariumsjs)
        * [Query `loadActorName](#query-loadactorname)
        * [Query `createConfigPatchHandler](#query-createconfigpatchhandler)
        * [Query `PATCH /api/aquariums/:aquariumId/temperature-config](#query-patch-apiaquariumsaquariumidtemperature-config)
        * [Query `PATCH /api/aquariums/:aquariumId/lighting-config](#query-patch-apiaquariumsaquariumidlighting-config)
        * [Query `PATCH /api/aquariums/:aquariumId/feeder-config](#query-patch-apiaquariumsaquariumidfeeder-config)
        * [Query `PATCH /api/aquariums/:aquariumId/system-config](#query-patch-apiaquariumsaquariumidsystem-config)
        * [Query `queryTelemetryRecords](#query-querytelemetryrecords)
        * [Query `GET /api/aquariums](#query-get-apiaquariums)
        * [Query `GET /api/aquariums/:aquariumId](#query-get-apiaquariumsaquariumid)
        * [Query `POST /api/aquariums/:aquariumId/feeder/trigger](#query-post-apiaquariumsaquariumidfeedertrigger)
        * [Query `GET /api/aquariums/:aquariumId/telemetry/export](#query-get-apiaquariumsaquariumidtelemetryexport)
        * [Query `GET /api/aquariums/:aquariumId/telemetry](#query-get-apiaquariumsaquariumidtelemetry)
        * [Query `NOTIFICATION_STATE_JOIN](#query-notification_state_join)
        * [Query `GET /api/aquariums/:aquariumId/notifications](#query-get-apiaquariumsaquariumidnotifications)
        * [Query `PATCH /api/aquariums/:aquariumId/notifications/read-all](#query-patch-apiaquariumsaquariumidnotificationsread-all)
        * [Query `isNotificationVisibleToUser](#query-isnotificationvisibletouser)
        * [Query `PATCH /api/aquariums/:aquariumId/notifications/:notificationId/read](#query-patch-apiaquariumsaquariumidnotificationsnotificationidread)
        * [Query `DELETE /api/aquariums/:aquariumId/notifications/:notificationId](#query-delete-apiaquariumsaquariumidnotificationsnotificationid)
        * [Query `GET /api/aquariums/:aquariumId/members](#query-get-apiaquariumsaquariumidmembers)
        * [Query `GET /api/aquariums/:aquariumId/candidates](#query-get-apiaquariumsaquariumidcandidates)
        * [Query `PUT /api/aquariums/:aquariumId/members](#query-put-apiaquariumsaquariumidmembers)
        * [Query `DELETE /api/aquariums/:aquariumId/members/:userId](#query-delete-apiaquariumsaquariumidmembersuserid)
    * [Query backend/routes/auth.js](#query-backendroutesauthjs)
        * [Query `POST /api/auth/session](#query-post-apiauthsession)
        * [Query `POST /api/auth/password-changed](#query-post-apiauthpassword-changed)
    * [Query backend/routes/hardware.js](#query-backendrouteshardwarejs)
        * [Query `POST /api/hardware/:aquariumId/telemetry](#query-post-apihardwareaquariumidtelemetry)
        * [Query `POST /api/hardware/:aquariumId/telemetry/backlog](#query-post-apihardwareaquariumidtelemetrybacklog)
        * [Query `GET /api/hardware/:aquariumId/config](#query-get-apihardwareaquariumidconfig)
    * [Query backend/routes/users.js](#query-backendroutesusersjs)
        * [Query `GET /api/users/:userId](#query-get-apiusersuserid)
        * [Query `PUT /api/users/:userId](#query-put-apiusersuserid)
    * [Query backend/utils/device-watchdog.js](#query-backendutilsdevice-watchdogjs)
        * [Query `loadInitialTelemetryState](#query-loadinitialtelemetrystate)
        * [Query `notifyDeviceOffline](#query-notifydeviceoffline)
    * [Query backend/utils/notification-records.js](#query-backendutilsnotification-recordsjs)
        * [Query `addAquariumNotification](#query-addaquariumnotification)
        * [Query `addUserNotification](#query-addusernotification)
        * [Query `VISIBLE_NOTIFICATION_CONDITION](#query-visible_notification_condition)
    * [Supabase Auth dan Frontend](#supabase-auth-dan-frontend)
        * [Auth `getAccessToken](#auth-getaccesstoken)
        * [Auth `toAuthError](#auth-toautherror)
        * [Auth `syncBackendSession](#auth-syncbackendsession)
        * [Auth `loginWithEmail](#auth-loginwithemail)
        * [Auth `registerAccount](#auth-registeraccount)
        * [Auth `changePassword](#auth-changepassword)
        * [Auth `logoutAccount](#auth-logoutaccount)
        * [Auth `getUserProfile](#auth-getuserprofile)
        * [Auth `updateUserProfile](#auth-updateuserprofile)
        * [Auth `loadSavedSession](#auth-loadsavedsession)
        * [Auth `completeSignIn](#auth-completesignin)
        * [Auth `signOut](#auth-signout)
        * [Auth `handleUnauthorizedEvent](#auth-handleunauthorizedevent)
        * [Auth `hashDeviceKey](#auth-hashdevicekey)
    * [backend/config/aquarium-repository.js](#backendconfigaquarium-repositoryjs)
        * [getAquariumById](#getaquariumbyid)
        * [findAccessibleAquarium](#findaccessibleaquarium)
        * [getLightingAverageHours](#getlightingaveragehours)
        * [extractConfigSections](#extractconfigsections)
        * [buildAquariumResponse](#buildaquariumresponse)
    * [backend/config/database.js](#backendconfigdatabasejs)
        * [pg.types.setTypeParser](#pgtypessettypeparser)
        * [queryDatabase](#querydatabase)
        * [runInTransaction](#runintransaction)
    * [backend/supabase/config.toml](#backendsupabaseconfigtoml)
    * [backend/supabase/migrations/20261028000000_init.sql](#backendsupabasemigrations20261028000000_initsql)
        * [alter default privileges](#alter-default-privileges)
        * [profiles](#profiles)
        * [handle_new_user](#handle_new_user)
        * [on_auth_user_created](#on_auth_user_created)
        * [aquariums](#aquariums)
        * [aquarium_members](#aquarium_members)
        * [devices](#devices)
        * [device_state](#device_state)
        * [create_device_state](#create_device_state)
        * [on_aquarium_created](#on_aquarium_created)
        * [telemetry_history](#telemetry_history)
        * [lighting_usage](#lighting_usage)
        * [notifications](#notifications)
        * [notification_states](#notification_states)
        * [enable row level security](#enable-row-level-security)
        * [revoke all](#revoke-all)
    * [backend/supabase/migrations/20261028040017_viewer_monitoring.sql](#backendsupabasemigrations20261028040017_viewer_monitoringsql)
        * [monitoring_public](#monitoring_public)
    * [backend/supabase/migrations/20261028041718_one_device_per_aquarium.sql](#backendsupabasemigrations20261028041718_one_device_per_aquariumsql)
        * [devices_one_per_aquarium](#devices_one_per_aquarium)
        * [devices_aquarium_id_idx](#devices_aquarium_id_idx)

## Backend

Server Express: route, middleware, dan utilitas. Kode yang langsung memakai database ada di bagian Database.

### backend/.env.example

[backend/.env.example](../backend/.env.example)

Berkas ini adalah contoh pengaturan lingkungan untuk backend. Cara memakainya adalah menyalin berkas ini menjadi `backend/.env` lalu mengisi nilainya sendiri, dan berkas `.env` itu tidak boleh diunggah ke repositori karena berisi rahasia. Isinya dibaca oleh `index.js`, `config/database.js`, `middleware/auth.js`, dan `routes/auth.js`.

Pengaturan yang ada meliputi nomor port server (`PORT`, contoh 5000, bawaan 3000 jika kosong), mode lingkungan (`NODE_ENV`), dan alamat situs dashboard yang diizinkan memanggil server (`FRONTEND_ORIGIN`, dipakai ketat hanya pada mode `production`). Untuk login ada `SUPABASE_URL` dan `SUPABASE_ANON_KEY` dari Project Settings di Supabase, yang wajib diisi dan dipakai `middleware/auth.js` untuk memeriksa token login pengguna.

Untuk database ada `DATABASE_URL` (alamat sambungan lewat Session pooler Supabase, port 5432, berisi kata sandi database), `DATABASE_SSL` (`true` untuk database cloud, `false` untuk database lokal) dan `DB_POOL_MAX` (jumlah sambungan paling banyak, bawaan 5). Terakhir `ADMIN_EMAILS` berisi daftar email dipisah koma yang otomatis menjadi admin saat pertama kali login lewat `POST /api/auth/session`.

### backend/config/default-aquarium.js

[backend/config/default-aquarium.js](../backend/config/default-aquarium.js)

File kecil ini berisi satu fungsi yang membuat pengaturan awal untuk akuarium baru. Isinya mencakup info perangkat yang masih kosong, pengaturan suhu (target 24 derajat Celsius dengan batas 20 sampai 30), pengaturan lampu dan pemberi pakan yang berada pada mode manual tanpa jadwal, serta pengaturan sistem berupa pengecekan data alat setiap 30 detik dengan zona waktu `Asia/Jakarta`.

Fungsi ini dipakai oleh `POST /api/admin/aquariums` di `routes/admin.js` ketika admin membuat akuarium. Setiap panggilan menghasilkan salinan baru, sehingga akuarium yang berbeda tidak pernah berbagi objek pengaturan yang sama.

#### `createDefaultAquariumConfig`

[default-aquarium.js:2](../backend/config/default-aquarium.js#L2) · fungsi

Membuat paket pengaturan awal yang aman untuk akuarium yang baru dibuat.

### backend/index.js

[backend/index.js](../backend/index.js)

File ini adalah pintu masuk server backend. Di sinilah aplikasi Express dibuat, lalu semua bagian dipasang satu per satu: aturan CORS (izin situs mana yang boleh memanggil API dari browser), pembaca isi permintaan berformat JSON dengan batas 1 MB, dan kelima kelompok alamat `/api/*` yaitu `auth`, `users`, `admin`, `aquariums`, dan `hardware`. Nomor port diambil dari pengaturan `PORT` (bawaan 3000), dan daftar situs yang diizinkan diambil dari `FRONTEND_ORIGIN`.

Aturan CORS hanya ketat ketika server berjalan dalam mode production. Di mode lain semua situs diizinkan, dan permintaan tanpa asal situs (misalnya dari alat ESP32 atau perintah `curl`) selalu lolos. Di production, hanya situs yang tercantum di `FRONTEND_ORIGIN` yang diterima, sedangkan situs lain ditolak dengan error.

Di bagian bawah ada dua penangkap terakhir. Yang pertama menjawab 404 untuk alamat yang tidak dikenal, dan yang kedua menangkap semua error yang lolos dari rute. Kegagalan di sisi server hanya dicatat di log dan pengguna menerima pesan umum, sedangkan error karena kesalahan pengguna (misalnya dari `badRequestError`) ditampilkan apa adanya. Setelah itu server mulai menerima permintaan, mengecek koneksi database, dan menyalakan pemantau perangkat dari `utils/device-watchdog.js`. File ini dijalankan lewat `npm start` atau `npm run dev`.

#### `cors`

[index.js:22](../backend/index.js#L22) · middleware

Menentukan situs mana yang boleh memanggil API dari browser.

#### `express.json`

[index.js:31](../backend/index.js#L31) · middleware

Membaca isi permintaan berformat JSON dengan batas ukuran agar server tidak kewalahan.

#### `req.body ||= {}`

[index.js:34](../backend/index.js#L34) · middleware

Memastikan isi permintaan selalu ada, minimal kosong, supaya rute di bawahnya aman membaca isiannya.

#### `GET /api/health`

[index.js:39](../backend/index.js#L39) · route

Alamat untuk mengecek apakah server masih hidup tanpa perlu login.

#### `app.use("/api/auth", authRoutes)`

[index.js:40](../backend/index.js#L40) · route

Memasang alamat penyiapan profil setelah login dan pencatatan ganti password di bawah awalan `/api/auth`.

#### `app.use("/api/users", userRoutes)`

[index.js:41](../backend/index.js#L41) · route

Memasang alamat untuk membaca dan mengubah profil pengguna di bawah awalan `/api/users`.

#### `app.use("/api/admin", adminRoutes)`

[index.js:42](../backend/index.js#L42) · route

Memasang alamat pengelolaan khusus admin di bawah awalan `/api/admin`.

#### `app.use("/api/aquariums", aquariumRoutes)`

[index.js:43](../backend/index.js#L43) · route

Memasang alamat untuk melihat dan mengatur akuarium di bawah awalan `/api/aquariums`.

#### `app.use("/api/hardware", hardwareRoutes)`

[index.js:44](../backend/index.js#L44) · route

Memasang alamat yang dipakai alat ESP32 di akuarium di bawah awalan `/api/hardware`.

#### `API endpoint was not found.`

[index.js:47](../backend/index.js#L47) · handler

Menjawab 404 untuk setiap alamat yang tidak cocok dengan rute mana pun.

#### `(error, req, res, next)`

[index.js:50](../backend/index.js#L50) · handler

Menangkap semua error yang tidak tertangani dan mengubahnya menjadi jawaban yang rapi bagi pengguna.

#### `app.listen`

[index.js:60](../backend/index.js#L60) · fungsi

Menyalakan server, mengecek koneksi database, dan menghidupkan pemantau perangkat.

### backend/middleware/auth.js

[backend/middleware/auth.js](../backend/middleware/auth.js)

File ini adalah penjaga pintu API yang memeriksa siapa yang sedang memanggil. Ada tiga jenis pemanggil: pengguna biasa yang membawa token login Supabase di header `Authorization: Bearer token` (`requireUserAuth`), admin yang dikenali dari peran umumnya (`requireAdminRole`), dan alat ESP32 yang menunjukkan kunci perangkat di header `x-device-key` (`requireDeviceKey`). Satu penjaga lagi, `requireDeviceOwnsAquarium`, memastikan sebuah alat hanya mengurus akuarium miliknya sendiri.

Agar server tidak terus bertanya ke Supabase dan database, file ini memakai tiga penyimpanan sementara dari `utils/ttl-cache.js`. Token yang sudah dinyatakan asli diingat 30 detik (maksimal 200 entri), peran umum pengguna (`admin` atau `user`) diingat 5 menit, dan pencocokan kunci perangkat diingat 5 menit. Kunci perangkat yang tidak dikenal juga diingat sebagai `null` supaya tebakan kunci tidak terus membebani database. Jika pengaturan `SUPABASE_URL` atau `SUPABASE_ANON_KEY` kosong, server langsung gagal menyala saat file dimuat.

Dari sisi keamanan, kunci perangkat tidak pernah disimpan dalam bentuk aslinya: `hashDeviceKey` mengacaknya dengan SHA-256 dan hanya hasil acakannya yang dicocokkan dengan tabel `devices`. Ketika peran pengguna berubah atau perangkat didaftarkan atau dicabut, rute terkait memanggil `invalidateGlobalRole` dan `invalidateDeviceKeyCache` agar perubahan langsung berlaku. Semua kumpulan rute di `backend/routes/` memakai file ini.

#### `hashDeviceKey`

[auth.js:21](../backend/middleware/auth.js#L21) · fungsi

Mengacak kunci perangkat menjadi kode yang tidak bisa dikembalikan ke bentuk asal sehingga kunci asli tidak perlu disimpan.

#### `invalidateGlobalRole`

[auth.js:24](../backend/middleware/auth.js#L24) · fungsi

Membuang peran umum seorang pengguna dari penyimpanan sementara agar peran terbaru langsung terbaca.

#### `invalidateDeviceKeyCache`

[auth.js:27](../backend/middleware/auth.js#L27) · fungsi

Mengosongkan penyimpanan sementara kunci perangkat agar kunci yang dicabut tidak lagi dianggap sah.

#### `loadGlobalRole`

[auth.js:30](../backend/middleware/auth.js#L30) · fungsi async

Mencari peran umum seorang pengguna, yaitu admin atau pengguna biasa, dari tabel profil.

#### `verifyAccessToken`

[auth.js:40](../backend/middleware/auth.js#L40) · fungsi async

Memeriksa apakah token login seseorang asli dengan bertanya ke Supabase.

#### `requireUserAuth`

[auth.js:52](../backend/middleware/auth.js#L52) · middleware

Mewajibkan pengguna sudah login dan mencatat data pengguna untuk dipakai rute berikutnya.

#### `requireAdminRole`

[auth.js:71](../backend/middleware/auth.js#L71) · middleware

Hanya meloloskan pengguna yang berperan admin dan menolak yang lain.

#### `requireDeviceKey`

[auth.js:79](../backend/middleware/auth.js#L79) · middleware

Memeriksa kunci perangkat yang dikirim alat ESP32 dan mencatat perangkat serta akuariumnya jika kunci cocok.

#### `requireDeviceOwnsAquarium`

[auth.js:97](../backend/middleware/auth.js#L97) · middleware

Memastikan sebuah alat hanya boleh mengurus akuarium miliknya sendiri.

### backend/package.json

[backend/package.json](../backend/package.json)

Berkas ini berisi identitas dan daftar kebutuhan paket backend. Backend memakai modul ES (`"type": "module"`), kerangka Express 5, pustaka `pg` untuk database PostgreSQL, `@supabase/supabase-js` untuk login, `cors`, dan `dotenv`. Untuk pengembangan ada `nodemon`, `prettier`, `supabase` (CLI), dan `@electric-sql/pglite` yang dipakai tes penguncian database.

Berkas ini juga menyediakan empat perintah yang dijalankan dari folder `backend/` dengan `npm run`. Perintah `start` dan `dev` dipakai untuk menjalankan server, `format` untuk merapikan kode, dan `test` untuk menjalankan tes otomatis.

#### `start`

[package.json:8](../backend/package.json#L8) · task

Menjalankan server tanpa restart otomatis, cocok untuk produksi.

#### `dev`

[package.json:9](../backend/package.json#L9) · task

Menjalankan server dengan restart otomatis setiap ada berkas yang berubah, cocok untuk pengembangan.

#### `format`

[package.json:10](../backend/package.json#L10) · task

Merapikan penulisan semua berkas JavaScript secara otomatis agar gayanya seragam.

#### `test`

[package.json:11](../backend/package.json#L11) · task

Menjalankan tes otomatis bawaan Node, termasuk tes penguncian akses database.

### backend/routes/admin.js

[backend/routes/admin.js](../backend/routes/admin.js)

File ini berisi kumpulan alamat `/api/admin` untuk pengelolaan pengguna, akuarium, dan perangkat yang hanya boleh dilakukan admin; dipakai oleh halaman Access atau admin di tampilan web. Seluruh alamat mewajibkan pengguna sudah login lalu berperan admin, karena `requireUserAuth` dan `requireAdminRole` dipasang untuk seluruh kumpulan.

Untuk pengguna, admin bisa melihat daftar semua pengguna beserta akuarium yang mereka ikuti dan mengubah peran umum seorang pengguna menjadi `admin` atau `user` (admin tidak boleh menurunkan perannya sendiri). Untuk akuarium, admin bisa membuat akuarium baru dengan pengaturan awal dari `createDefaultAquariumConfig` dan pemilik opsional, melihat daftar akuarium, serta mengubah nama atau status pantauan publik (`monitoringPublic`). ID yang sudah dipakai dijawab 409.

Untuk perangkat, satu akuarium hanya boleh punya satu perangkat. Saat perangkat didaftarkan, server membuat kunci acak, hanya menyimpan versi acaknya (hash), dan mengirim kunci asli satu kali saja dalam jawaban, sehingga harus segera disalin. Kunci perangkat tidak pernah ikut dikirim ketika daftar perangkat ditampilkan. Setiap perubahan peran, pendaftaran, atau pencabutan perangkat membersihkan penyimpanan sementara di `middleware/auth.js` supaya langsung berlaku. Kode error database `23505` (data kembar) dipakai untuk mengenali ID akuarium atau perangkat yang sudah ada.

#### `parseTrimmedName`

[admin.js:23](../backend/routes/admin.js#L23) · fungsi

Membersihkan spasi pada sebuah nama dan memastikan panjangnya 1 sampai 80 karakter.

#### `GET /api/admin/users`

[admin.js:30](../backend/routes/admin.js#L30) · route

Menampilkan daftar semua pengguna beserta akuarium dan peran akses tertingginya untuk admin.

#### `PATCH /api/admin/users/:userId`

[admin.js:60](../backend/routes/admin.js#L60) · route

Mengubah peran umum seorang pengguna menjadi admin atau pengguna biasa.

#### `POST /api/admin/aquariums`

[admin.js:78](../backend/routes/admin.js#L78) · route

Membuat akuarium baru lengkap dengan pengaturan awal dan pemilik yang boleh ditentukan.

#### `GET /api/admin/aquariums`

[admin.js:135](../backend/routes/admin.js#L135) · route

Menampilkan daftar semua akuarium beserta jumlah anggota, jumlah perangkat, dan pemiliknya.

#### `PATCH /api/admin/aquariums/:aquariumId`

[admin.js:153](../backend/routes/admin.js#L153) · route

Mengubah nama akuarium dan atau status pantauan publiknya.

#### `aquariumExistsById`

[admin.js:178](../backend/routes/admin.js#L178) · fungsi async

Mengecek apakah akuarium dengan ID tertentu ada di database.

#### `GET /api/admin/aquariums/:aquariumId/devices`

[admin.js:185](../backend/routes/admin.js#L185) · route

Menampilkan perangkat yang terpasang pada sebuah akuarium tanpa menyertakan kunci perangkatnya.

#### `POST /api/admin/aquariums/:aquariumId/devices`

[admin.js:197](../backend/routes/admin.js#L197) · route

Mendaftarkan perangkat baru ke sebuah akuarium dan memberikan kunci perangkatnya satu kali.

#### `DELETE /api/admin/devices/:deviceId`

[admin.js:231](../backend/routes/admin.js#L231) · route

Mencabut sebuah perangkat dari akuarium sehingga kuncinya tidak berlaku lagi.

### backend/routes/aquariums.js

[backend/routes/aquariums.js](../backend/routes/aquariums.js)

Berkas ini berisi semua alamat layanan (route) di server yang berhubungan dengan akuarium dan dipasang di bawah `/api/aquariums`. Isinya mencakup melihat daftar dan detail akuarium, mengubah empat kelompok pengaturan (suhu, lampu, pakan, sistem), memberi makan ikan secara manual, melihat dan mengunduh riwayat suhu, membaca notifikasi, serta mengatur siapa saja yang boleh mengakses akuarium. Fungsi bantu di bagian atas, seperti `parseLimitParam`, `describeConfigValue`, dan `escapeCsvCell`, dipakai untuk memeriksa masukan dan menyusun kalimat notifikasi atau file CSV.

Semua alamat di sini hanya bisa dipakai oleh pengguna yang sudah login (lewat `requireUserAuth`), dan hak akses per akuarium diperiksa dengan `findAccessibleAquarium`. Ada empat tingkat peran: penonton (`viewer`) hanya boleh melihat, anggota (`member`) boleh mengubah pengaturan dan mengelola notifikasi, pemilik (`owner`) boleh mengatur siapa yang punya akses, dan admin boleh semuanya, termasuk menetapkan pemilik. Halaman dashboard memanggil alamat-alamat ini setiap kali pengguna membuka atau mengubah sesuatu pada akuarium.

Saat pengaturan diubah, `createConfigPatchHandler` menjalankan seluruh prosesnya dalam satu transaksi database. Isiannya divalidasi memakai aturan dari `utils/config-validation.js`, hanya nilai yang benar-benar berubah yang disimpan, dan sebuah notifikasi berisi nama pengubah dan ringkasan perubahan dibuat lewat `utils/notification-records.js`. Setelah itu `publishConfigChange` memberi tahu alat ESP32 agar segera mengambil pengaturan baru, yang berhubungan dengan `routes/hardware.js`.

Status baca dan hapus notifikasi dicatat per pengguna, sehingga menghapus notifikasi hanya menyembunyikannya bagi pengguna itu. Pengecekan input dilakukan dengan ketat, misalnya jumlah data riwayat dibatasi paling banyak 500, dan isi file CSV diberi pengaman agar tidak dibaca sebagai rumus oleh Excel.

#### `parseLimitParam`

[aquariums.js:44](../backend/routes/aquariums.js#L44) · fungsi

Membaca jumlah data yang diminta pengguna dan membatasinya agar tidak melebihi batas maksimum.

#### `parseDateParam`

[aquariums.js:51](../backend/routes/aquariums.js#L51) · fungsi

Mengubah tulisan tanggal dari pengguna menjadi tanggal yang bisa diproses, atau kosong jika tidak valid.

#### `loadActorName`

[aquariums.js:58](../backend/routes/aquariums.js#L58) · fungsi async

Mengambil nama lengkap pengguna yang melakukan perubahan untuk dicantumkan di notifikasi.

#### `resolveConfigFieldPath`

[aquariums.js:64](../backend/routes/aquariums.js#L64) · fungsi

Menentukan di bagian mana sebuah pengaturan disimpan, dengan pengecualian khusus untuk satuan suhu.

#### `getValueAtPath`

[aquariums.js:69](../backend/routes/aquariums.js#L69) · fungsi

Mengambil sebuah nilai yang tersimpan berlapis di dalam data berdasarkan alamat yang dipisah titik.

#### `describeConfigField`

[aquariums.js:74](../backend/routes/aquariums.js#L74) · fungsi

Menyiapkan nama pengaturan yang enak dibaca manusia untuk dipakai di kalimat notifikasi.

#### `describeConfigValue`

[aquariums.js:79](../backend/routes/aquariums.js#L79) · fungsi

Menyiapkan tulisan nilai pengaturan yang mudah dipahami, lengkap dengan satuannya, untuk notifikasi.

#### `createConfigPatchHandler`

[aquariums.js:94](../backend/routes/aquariums.js#L94) · fungsi

Membuat pengurus permintaan ubah pengaturan untuk satu kelompok pengaturan, termasuk validasi, penyimpanan, notifikasi, dan pemberitahuan ke alat.

#### `escapeCsvCell`

[aquariums.js:168](../backend/routes/aquariums.js#L168) · fungsi

Menyiapkan satu isi sel untuk file CSV agar aman dibuka di Excel tanpa dijalankan sebagai rumus.

#### `queryTelemetryRecords`

[aquariums.js:175](../backend/routes/aquariums.js#L175) · fungsi async

Mengambil riwayat pembacaan akuarium dari yang terbaru setelah memeriksa jumlah dan rentang tanggal yang diminta.

#### `GET /api/aquariums`

[aquariums.js:202](../backend/routes/aquariums.js#L202) · route

Memberikan daftar akuarium yang boleh dilihat pengguna yang sedang login beserta perannya.

#### `GET /api/aquariums/:aquariumId`

[aquariums.js:224](../backend/routes/aquariums.js#L224) · route

Memberikan data lengkap satu akuarium kepada siapa pun yang punya akses, termasuk penonton.

#### `PATCH /api/aquariums/:aquariumId/temperature-config`

[aquariums.js:231](../backend/routes/aquariums.js#L231) · route

Mengubah pengaturan suhu akuarium, seperti suhu target, batas suhu, dan kendali heater.

#### `PATCH /api/aquariums/:aquariumId/lighting-config`

[aquariums.js:235](../backend/routes/aquariums.js#L235) · route

Mengubah pengaturan lampu akuarium, yaitu mode otomatis atau manual dan jadwal nyala.

#### `PATCH /api/aquariums/:aquariumId/feeder-config`

[aquariums.js:239](../backend/routes/aquariums.js#L239) · route

Mengubah pengaturan pemberi pakan ikan, yaitu mode dan jadwal jam pemberian pakan.

#### `PATCH /api/aquariums/:aquariumId/system-config`

[aquariums.js:240](../backend/routes/aquariums.js#L240) · route

Mengubah pengaturan sistem akuarium, yaitu satuan suhu, seberapa sering alat melapor, dan zona waktu.

#### `POST /api/aquariums/:aquariumId/feeder/trigger`

[aquariums.js:243](../backend/routes/aquariums.js#L243) · route

Memerintahkan pemberi pakan untuk memberi makan ikan sekarang, hanya jika mode pakan sedang manual.

#### `GET /api/aquariums/:aquariumId/telemetry/export`

[aquariums.js:274](../backend/routes/aquariums.js#L274) · route

Mengunduh riwayat pembacaan akuarium sebagai file CSV yang bisa dibuka di Excel.

#### `GET /api/aquariums/:aquariumId/telemetry`

[aquariums.js:294](../backend/routes/aquariums.js#L294) · route

Memberikan riwayat pembacaan akuarium untuk ditampilkan di layar, dari yang terbaru.

#### `GET /api/aquariums/:aquariumId/notifications`

[aquariums.js:307](../backend/routes/aquariums.js#L307) · route

Memberikan daftar notifikasi milik pengguna di satu akuarium, yang bisa disaring menurut status baca.

#### `PATCH /api/aquariums/:aquariumId/notifications/read-all`

[aquariums.js:333](../backend/routes/aquariums.js#L333) · route

Menandai semua notifikasi yang belum dibaca sebagai sudah dibaca sekaligus untuk pengguna ini.

#### `isNotificationVisibleToUser`

[aquariums.js:349](../backend/routes/aquariums.js#L349) · fungsi async

Memeriksa apakah sebuah notifikasi memang boleh dilihat oleh pengguna di akuarium tersebut.

#### `PATCH /api/aquariums/:aquariumId/notifications/:notificationId/read`

[aquariums.js:359](../backend/routes/aquariums.js#L359) · route

Menandai satu notifikasi sebagai sudah dibaca oleh pengguna.

#### `DELETE /api/aquariums/:aquariumId/notifications/:notificationId`

[aquariums.js:375](../backend/routes/aquariums.js#L375) · route

Menghapus satu notifikasi dari tampilan pengguna tanpa memengaruhi anggota lain.

#### `GET /api/aquariums/:aquariumId/members`

[aquariums.js:391](../backend/routes/aquariums.js#L391) · route

Memberikan daftar orang yang punya akses ke akuarium beserta perannya, khusus untuk pemilik dan admin.

#### `GET /api/aquariums/:aquariumId/candidates`

[aquariums.js:406](../backend/routes/aquariums.js#L406) · route

Memberikan daftar pengguna yang bisa ditambahkan ke akuarium ini karena belum menjadi anggotanya.

#### `PUT /api/aquariums/:aquariumId/members`

[aquariums.js:422](../backend/routes/aquariums.js#L422) · route

Menambahkan seseorang ke akuarium atau mengubah perannya menjadi pemilik atau anggota.

#### `DELETE /api/aquariums/:aquariumId/members/:userId`

[aquariums.js:456](../backend/routes/aquariums.js#L456) · route

Mencabut akses seseorang dari akuarium.

### backend/routes/auth.js

[backend/routes/auth.js](../backend/routes/auth.js)

File ini berisi kumpulan alamat `/api/auth`, yaitu dua alamat yang dipanggil tepat setelah pengguna login atau ganti password lewat Supabase. Pengecekan login (`requireUserAuth`) dipasang pada tiap alamat, bukan pada seluruh kumpulan, karena alamat-alamat ini dipakai pada saat sesi baru terbentuk. Alamat-alamat ini dipanggil oleh halaman login dan akun di tampilan web.

Alamat `POST /api/auth/session` memastikan profil pengguna ada di database. Profil dibuat bila belum ada, foto diperbarui bila dikirim, dan pengguna yang emailnya ada di pengaturan `ADMIN_EMAILS` otomatis dinaikkan menjadi admin, yang menjadi cara menunjuk admin pertama. Nama lengkap dibatasi 120 karakter dan, jika tidak dikirim, dipakai nama dari data akun atau bagian depan email. Foto diperiksa oleh `isValidProfilePhotoUrl`.

Alamat `POST /api/auth/password-changed` hanya mencatat notifikasi pribadi bahwa kata sandi sudah diganti. Setelah profil disimpan, peran yang tersimpan sementara di `middleware/auth.js` dibuang agar peran terbaru langsung terbaca.

#### `toSessionProfile`

[auth.js:19](../backend/routes/auth.js#L19) · fungsi

Mengubah satu baris profil dari database menjadi bentuk jawaban untuk tampilan.

#### `POST /api/auth/session`

[auth.js:32](../backend/routes/auth.js#L32) · route

Memastikan profil pengguna ada di database setelah ia login dan menyiapkan perannya.

#### `POST /api/auth/password-changed`

[auth.js:72](../backend/routes/auth.js#L72) · route

Mencatat notifikasi pribadi bahwa pengguna baru saja mengganti kata sandi.

### backend/routes/hardware.js

[backend/routes/hardware.js](../backend/routes/hardware.js)

Berkas ini berisi layanan di server yang khusus dipakai oleh alat ESP32 di akuarium, dipasang di bawah `/api/hardware`. Ada tiga alamat utama: menerima laporan rutin alat (`POST /api/hardware/:aquariumId/telemetry`), menerima kumpulan pembacaan tertunda dari alat yang sempat offline (`.../telemetry/backlog`), dan memberikan pengaturan terbaru ke alat (`GET /api/hardware/:aquariumId/config`). Fungsi bantu seperti `parseDeviceTimestamp`, `isTempOutOfRange`, dan `calculateLightingUsageDelta` dipakai untuk memeriksa laporan dan menghitung pemakaian lampu.

Berbeda dengan `routes/aquariums.js`, alamat di sini tidak memakai login pengguna. Alat harus membawa kunci perangkat (`requireDeviceKey`) dan hanya boleh mengurus akuarium miliknya sendiri (`requireDeviceOwnsAquarium`). Suhu dari alat harus berada di rentang -10 sampai 60 derajat Celsius dan status heater, lampu, serta pemberi pakan harus berbentuk benar, kalau tidak laporan ditolak.

Saat laporan rutin masuk, server memperbarui kondisi terkini akuarium, mencatat berapa lama lampu menyala per hari (disimpan 7 hari), dan menyimpan riwayat bila ada perubahan status, suhu melewati batas, atau sudah sekitar satu menit sejak catatan terakhir. Server juga membuat notifikasi otomatis, misalnya alat menyala ulang beserta alasannya, sensor suhu rusak, suhu di luar batas, dan alat kembali online. Waktu ukur yang terlalu lama atau terlalu jauh di masa depan tidak dipercaya, dan pembacaan tertunda dibatasi paling banyak 50 per kiriman serta paling tua 7 hari.

Pengambilan pengaturan memakai sistem tunggu-sampai-ada-perubahan (long polling) yang menahan jawaban paling lama 25 detik lewat `waitForConfigChange`, sehingga alat menerima perubahan dari dashboard hampir seketika. Dari pengaturan sistem, alat hanya menerima selang lapor dan zona waktu. Setiap laporan yang masuk juga dicatat ke `utils/device-watchdog.js`, yang dipakai server untuk mendeteksi alat yang berhenti melapor.

#### `isOnOffState`

[hardware.js:45](../backend/routes/hardware.js#L45) · fungsi

Memeriksa apakah sebuah nilai berbunyi tepat `ON` atau `OFF`.

#### `isFeederStatusValue`

[hardware.js:47](../backend/routes/hardware.js#L47) · fungsi

Memeriksa apakah status pemberi pakan berbunyi tepat `Idle` atau `Active`.

#### `formatLocalDay`

[hardware.js:50](../backend/routes/hardware.js#L50) · fungsi

Menghasilkan tanggal hari ini menurut zona waktu akuarium untuk mengelompokkan pemakaian lampu per hari.

#### `isTempOutOfRange`

[hardware.js:64](../backend/routes/hardware.js#L64) · fungsi

Memeriksa apakah suhu terlalu dingin atau terlalu panas dibanding batas yang diatur untuk akuarium.

#### `parseDeviceTimestamp`

[hardware.js:68](../backend/routes/hardware.js#L68) · fungsi

Mengubah waktu ukur dari alat menjadi tanggal yang bisa diproses, atau kosong jika tidak masuk akal.

#### `calculateLightingUsageDelta`

[hardware.js:77](../backend/routes/hardware.js#L77) · fungsi

Menghitung berapa detik lampu menyala atau mati sejak laporan sebelumnya untuk dicatat pada hari setempat.

#### `POST /api/hardware/:aquariumId/telemetry`

[hardware.js:92](../backend/routes/hardware.js#L92) · route

Menerima laporan rutin dari alat, memperbarui kondisi terkini, menyimpan riwayat, dan membuat notifikasi bila perlu.

#### `POST /api/hardware/:aquariumId/telemetry/backlog`

[hardware.js:250](../backend/routes/hardware.js#L250) · route

Menerima kumpulan pembacaan tertunda dari alat yang sempat offline dan memasukkannya ke riwayat.

#### `GET /api/hardware/:aquariumId/config`

[hardware.js:307](../backend/routes/hardware.js#L307) · route

Memberikan pengaturan terbaru ke alat, dengan opsi menunggu sampai ada perubahan.

### backend/routes/users.js

[backend/routes/users.js](../backend/routes/users.js)

File ini berisi kumpulan alamat `/api/users` untuk membaca dan mengubah profil pengguna, dipakai oleh halaman profil di tampilan web. Seluruh alamat di dalamnya hanya bisa dipakai pengguna yang sudah login karena `requireUserAuth` dipasang untuk seluruh kumpulan.

Aturan aksesnya berbeda untuk membaca dan mengubah. Profil boleh dibaca oleh pemiliknya atau admin, sedangkan mengubah profil hanya boleh dilakukan oleh pemiliknya sendiri, bahkan admin pun ditolak. Pemeriksaan itu dibantu oleh `isOwnProfileRequest`, yang membandingkan ID di alamat dengan ID pengguna yang login.

Saat mengubah profil, yang bisa diubah adalah nama lengkap (1 sampai 120 karakter) dan foto yang diperiksa lebih dulu. Profil dikunci selama proses supaya aman dari perubahan bersamaan. Jika nilai baru ternyata sama dengan yang sekarang, tidak ada yang diubah, dan jika berubah maka notifikasi pribadi `Profile updated` ditambahkan.

#### `toUserProfileResponse`

[users.js:13](../backend/routes/users.js#L13) · fungsi

Mengubah satu baris profil dari database menjadi jawaban profil lengkap untuk tampilan.

#### `isOwnProfileRequest`

[users.js:27](../backend/routes/users.js#L27) · fungsi

Mengecek apakah profil yang diminta adalah profil milik pengguna yang sedang login.

#### `GET /api/users/:userId`

[users.js:32](../backend/routes/users.js#L32) · route

Mengambil data profil seorang pengguna untuk pemiliknya atau admin.

#### `PUT /api/users/:userId`

[users.js:44](../backend/routes/users.js#L44) · route

Mengubah nama dan foto profil milik pengguna sendiri.

### backend/tests/lockdown.test.js

[backend/tests/lockdown.test.js](../backend/tests/lockdown.test.js)

Berkas ini berisi tes otomatis yang membuktikan bahwa penguncian database bekerja. Tes menjalankan semua berkas migrasi dari folder `supabase/migrations/` pada database tiruan PGlite yang dibuat oleh `supabaseLikeDatabase`, lengkap dengan peran `anon`, `authenticated`, dan `supabase_auth_admin` serta tabel akun `auth.users`. Dengan begitu tes tidak butuh server Supabase sungguhan dan bisa berjalan di komputer mana pun.

Yang diperiksa adalah bahwa pengguna luar (peran `anon` dan `authenticated`) ditolak dengan kode kesalahan izin ditolak (`42501`) ketika mencoba membaca atau menghapus isi setiap tabel di schema `public`, dan ketika memanggil fungsi database apa pun. Tes juga memastikan tabel atau fungsi yang ditambahkan di kemudian hari otomatis tertutup, karena hak bawaan sudah dicabut oleh migrasi awal.

Selain itu ada tes bahwa trigger pembuat profil tetap berjalan untuk akun baru dari Supabase Auth, dan tes lapisan pengaman kedua: tabel dengan pengaman tingkat baris (RLS) tanpa aturan izin tetap menahan akses walau ada izin yang keliru. Satu tes pembanding sengaja melemahkan migrasi untuk membuktikan bahwa tanpa pencabutan hak bawaan tabel baru memang bocor, sehingga tes-tes lain terbukti bermakna.

Tes ini dijalankan dengan perintah `npm test` dari folder `backend/` dan sebaiknya dijalankan setiap kali ada migrasi baru, supaya tidak ada tabel atau fungsi yang tanpa sengaja terbuka ke publik.

#### `supabaseLikeDatabase`

[lockdown.test.js:16](../backend/tests/lockdown.test.js#L16) · fungsi async

Membuat database tiruan yang meniru Supabase lalu menjalankan semua migrasi di dalamnya.

#### `runAs`

[lockdown.test.js:34](../backend/tests/lockdown.test.js#L34) · fungsi async

Menjalankan perintah database dengan menyamar sebagai peran tertentu dan melaporkan berhasil atau kode kesalahannya.

#### `ada tabel di schema public yang diperiksa`

[lockdown.test.js:50](../backend/tests/lockdown.test.js#L50) · fungsi

Memastikan daftar tabel yang diuji tidak kosong supaya tes lain benar-benar memeriksa sesuatu.

#### `${role}: semua tabel public menolak baca dan hapus`

[lockdown.test.js:55](../backend/tests/lockdown.test.js#L55) · fungsi

Membuktikan pengguna luar tidak bisa membaca atau menghapus isi tabel mana pun secara langsung.

#### `${role}: semua fungsi public tidak bisa dipanggil (RPC Data API)`

[lockdown.test.js:64](../backend/tests/lockdown.test.js#L64) · fungsi

Membuktikan pengguna luar tidak bisa menjalankan fungsi database apa pun lewat layanan data bawaan.

#### `${role}: tabel dan fungsi yang ditambahkan nanti otomatis tertutup`

[lockdown.test.js:77](../backend/tests/lockdown.test.js#L77) · fungsi

Membuktikan tabel dan fungsi yang dibuat setelah migrasi otomatis tidak bisa diakses pengguna luar.

#### `trigger pembuat profil tetap berjalan untuk Supabase Auth`

[lockdown.test.js:86](../backend/tests/lockdown.test.js#L86) · fungsi

Memastikan setiap akun baru otomatis dibuatkan profil dengan nama, email huruf kecil, dan peran `user`.

#### `RLS tanpa policy tetap menahan walau ada GRANT yang keliru`

[lockdown.test.js:97](../backend/tests/lockdown.test.js#L97) · fungsi

Membuktikan pengaman tingkat baris tetap menahan akses walau izin tabel diberikan secara keliru.

#### `kontrol: tanpa pencabutan hak bawaan, tabel baru memang bocor (uji ini bermakna)`

[lockdown.test.js:118](../backend/tests/lockdown.test.js#L118) · fungsi

Tes pembanding yang membuktikan tes lain sungguh menguji perlindungan karena tanpa pencabutan hak bawaan tabel baru memang bocor.

### backend/utils/access-roles.js

[backend/utils/access-roles.js](../backend/utils/access-roles.js)

File ini berisi daftar peran akses beserta alat bantu kecil untuk membandingkan peran dan memeriksa bentuk ID. Peran yang dikenal adalah `viewer`, `member`, `owner`, dan `admin`, dengan tingkatan dari 1 sampai 4 sehingga peran bisa dibandingkan dengan angka. Hanya `owner` dan `member` yang boleh diberikan kepada anggota akuarium (`ASSIGNABLE_MEMBER_ROLES`).

Dua pemeriksa bentuk ID, `isValidAquariumId` dan `isUuid`, dipakai sebelum ID dimasukkan ke perintah database. Dengan begitu ID yang salah bentuk dijawab sebagai tidak ditemukan dan tidak menyebabkan error database. Aturan ID akuarium sengaja sama dengan batasan pada tabel `aquariums`.

File ini dipakai oleh bagian data akuarium (`aquarium-repository.js`) serta rute `aquariums`, `admin`, dan `users`. Misalnya `GET /api/admin/users` memakai `highestAccessRole` untuk menampilkan peran tertinggi setiap pengguna.

#### `hasMinimumRole`

[access-roles.js:8](../backend/utils/access-roles.js#L8) · fungsi

Mengecek apakah sebuah peran cukup tinggi dibanding peran minimum yang diminta.

#### `isValidAquariumId`

[access-roles.js:11](../backend/utils/access-roles.js#L11) · fungsi

Mengecek apakah sebuah ID akuarium berbentuk benar.

#### `isUuid`

[access-roles.js:14](../backend/utils/access-roles.js#L14) · fungsi

Mengecek apakah sebuah teks berbentuk UUID, yaitu kode unik untuk ID pengguna dan perangkat.

#### `highestAccessRole`

[access-roles.js:18](../backend/utils/access-roles.js#L18) · fungsi

Menentukan peran tertinggi yang dimiliki seorang pengguna dari peran umum dan keanggotaannya.

### backend/utils/config-change-events.js

[backend/utils/config-change-events.js](../backend/utils/config-change-events.js)

File ini berfungsi sebagai pemberi kabar di memori server setiap kali pengaturan sebuah akuarium berubah. Untuk setiap akuarium disimpan sebuah pencatat berisi nomor perubahan terakhir dan daftar alat yang sedang menunggu kabar. Nomor versi pengaturan berbentuk `serverBootId.counter`; kode acak 8 karakter di depannya dibuat setiap server menyala, sehingga setelah server restart versinya pasti berbeda dan alat tahu harus mengambil pengaturan lagi.

Alurnya begini: alat ESP32 menanyakan pengaturan sambil menyebut versi yang ia pegang, lalu `waitForConfigChange` menahan jawabannya sampai ada perubahan. Penantian berakhir bila versi sudah berbeda, bila `publishConfigChange` dipanggil, bila waktu tunggu habis, atau bila sambungan alat terputus. Dalam semua kasus itu alat yang menunggu dibersihkan dari daftar supaya tidak menumpuk.

`routes/aquariums.js` memakai `publishConfigChange` untuk mengumumkan perubahan, misalnya setelah pengaturan diubah atau perintah memberi pakan dikirim, dan `routes/hardware.js` memakai `getConfigVersion` serta `waitForConfigChange` untuk melayani alat. Karena datanya hanya ada di memori, semua catatan hilang saat server dimatikan.

#### `getChangeHub`

[config-change-events.js:10](../backend/utils/config-change-events.js#L10) · fungsi

Mengambil pencatat perubahan milik sebuah akuarium dan membuatnya dulu bila belum ada.

#### `getConfigVersion`

[config-change-events.js:20](../backend/utils/config-change-events.js#L20) · fungsi

Memberi nomor versi pengaturan sebuah akuarium saat ini agar alat tahu apakah pengaturannya sudah usang.

#### `publishConfigChange`

[config-change-events.js:23](../backend/utils/config-change-events.js#L23) · fungsi

Menandai bahwa pengaturan sebuah akuarium berubah dan membangunkan alat yang sedang menunggu.

#### `waitForConfigChange`

[config-change-events.js:30](../backend/utils/config-change-events.js#L30) · fungsi

Menahan jawaban ke alat sampai ada perubahan pengaturan, waktu tunggu habis, atau sambungan terputus.

### backend/utils/config-validation.js

[backend/utils/config-validation.js](../backend/utils/config-validation.js)

File ini adalah pemeriksa pengaturan akuarium yang menolak isian salah dengan error 400. Isinya dibangun dari pemeriksa kecil yang bisa dirangkai: pilihan terbatas (`oneOfAllowed`), angka dalam rentang (`numberInRange`), isian ya atau tidak (`booleanField`), dan jam berformat `hh:mm AM/PM` (`timeField`). Pilihan yang diizinkan antara lain mode `AUTOMATIC` atau `MANUAL`, status saklar `ON` atau `OFF`, dan satuan suhu `Celsius` atau `Fahrenheit`. Jadwal pemberian pakan dibatasi paling banyak 12 per akuarium.

Pemeriksa yang lebih besar menangani bagian yang rumit. `validateLightingSchedule` memeriksa jadwal lampu (jam mulai dan selesai harus benar dan tidak boleh sama) dan selalu menghitung ulang lama jadwalnya di server, termasuk jadwal yang melewati tengah malam lewat `calculateScheduleDurationHours`. `validateFeederSchedules` memeriksa daftar jadwal pakan dan menolak jam yang kembar, sedangkan `validateTimezone` memastikan nama zona waktu dikenal sistem. `validateTemperatureThresholds` memastikan batas suhu bawah lebih kecil daripada batas atas.

Tabel `configFieldRules` merangkum isian apa saja yang boleh diubah di tiap kelompok pengaturan (suhu, lampu, pemberi pakan, sistem) beserta pemeriksanya, misalnya target suhu 10 sampai 35 dan frekuensi pengecekan 1 sampai 60 detik. File ini dipakai oleh `createConfigPatchHandler` di `routes/aquariums.js`, yang menolak isian tidak dikenal dan memeriksa nilainya sebelum disimpan.

#### `isPlainObject`

[config-validation.js:14](../backend/utils/config-validation.js#L14) · fungsi

Mengecek apakah sebuah data berupa objek biasa yang berisi isian bernama.

#### `oneOfAllowed`

[config-validation.js:19](../backend/utils/config-validation.js#L19) · fungsi

Membuat pemeriksa yang hanya menerima nilai yang ada di daftar pilihan.

#### `numberInRange`

[config-validation.js:27](../backend/utils/config-validation.js#L27) · fungsi

Membuat pemeriksa angka yang harus berada di antara batas bawah dan batas atas.

#### `booleanField`

[config-validation.js:37](../backend/utils/config-validation.js#L37) · fungsi

Membuat pemeriksa untuk isian ya atau tidak yang hanya menerima nilai benar atau salah.

#### `timeField`

[config-validation.js:45](../backend/utils/config-validation.js#L45) · fungsi

Membuat pemeriksa untuk isian jam berformat `hh:mm AM/PM`.

#### `validateTimezone`

[config-validation.js:55](../backend/utils/config-validation.js#L55) · fungsi

Memeriksa apakah nama zona waktu benar-benar dikenal oleh sistem.

#### `parseMinutesOfDay`

[config-validation.js:66](../backend/utils/config-validation.js#L66) · fungsi

Mengubah jam berformat `hh:mm AM/PM` menjadi jumlah menit sejak tengah malam.

#### `calculateScheduleDurationHours`

[config-validation.js:72](../backend/utils/config-validation.js#L72) · fungsi

Menghitung berapa jam sebuah jadwal berlangsung dari jam mulai sampai jam selesai.

#### `validateLightingSchedule`

[config-validation.js:78](../backend/utils/config-validation.js#L78) · fungsi

Memeriksa jadwal lampu dan mengembalikan jadwal yang sudah bersih dengan lama jadwal dihitung ulang.

#### `validateFeederSchedules`

[config-validation.js:96](../backend/utils/config-validation.js#L96) · fungsi

Memeriksa daftar jadwal pemberian pakan dan mengembalikan daftar yang sudah bersih.

#### `validateTemperatureThresholds`

[config-validation.js:137](../backend/utils/config-validation.js#L137) · fungsi

Memastikan batas suhu terendah lebih kecil daripada batas suhu tertinggi.

### backend/utils/device-watchdog.js

[backend/utils/device-watchdog.js](../backend/utils/device-watchdog.js)

File ini adalah penjaga yang memperhatikan apakah alat di setiap akuarium masih mengirim data, dan membuat notifikasi `Device Offline` bila alat diam terlalu lama. Di memori server dicatat kapan data terakhir diterima dari tiap akuarium, seberapa sering alat itu mengirim data, dan apakah notifikasi offline sudah dikirim. Catatan ini diisi ulang dari tabel `device_state` ketika server menyala, sehingga penjaga tetap bekerja dengan benar walau server baru saja restart.

Batas waktu sebuah alat dianggap offline adalah yang lebih besar antara 120 detik dan tiga kali jarak kirim data akuarium itu (jika jarak kirim tidak diketahui dipakai asumsi 5 detik). Pemeriksaan dilakukan setiap 30 detik. Sebelum notifikasi dibuat, data di database dikunci dan dicek ulang, lalu ditandai `offline_notified = true` agar notifikasi tidak dobel. Setiap kali alat mengirim data lagi, tanda di catatan memori itu dihapus sehingga alarm berikutnya bisa muncul bila alat mati lagi.

Penjaga dinyalakan dari `index.js` lewat `startDeviceWatchdog` dan diberi kabar oleh `routes/hardware.js` memakai `recordTelemetryReceived` setiap data masuk. Pewaktunya dibuat tidak menahan proses (`unref`), jadi server tetap bisa berhenti dengan normal. Hitungan `offlineThresholdSeconds` juga dipakai bagian lain untuk menentukan kapan jeda data dianggap terlalu lama.

#### `offlineThresholdSeconds`

[device-watchdog.js:12](../backend/utils/device-watchdog.js#L12) · fungsi

Menghitung berapa detik alat boleh diam sebelum dianggap offline.

#### `recordTelemetryReceived`

[device-watchdog.js:21](../backend/utils/device-watchdog.js#L21) · fungsi

Mencatat bahwa sebuah akuarium baru saja mengirim data sehingga tidak dianggap offline.

#### `loadInitialTelemetryState`

[device-watchdog.js:26](../backend/utils/device-watchdog.js#L26) · fungsi async

Mengambil kondisi data terakhir tiap akuarium dari database saat server baru menyala.

#### `notifyDeviceOffline`

[device-watchdog.js:42](../backend/utils/device-watchdog.js#L42) · fungsi async

Membuat notifikasi bahwa alat sebuah akuarium offline tanpa menggandakannya.

#### `checkOfflineDevices`

[device-watchdog.js:69](../backend/utils/device-watchdog.js#L69) · fungsi async

Memeriksa semua akuarium dan memberi notifikasi untuk alat yang sudah terlalu lama diam.

#### `startDeviceWatchdog`

[device-watchdog.js:82](../backend/utils/device-watchdog.js#L82) · fungsi

Menghidupkan penjaga perangkat agar memeriksa alat yang offline secara berkala.

### backend/utils/http-errors.js

[backend/utils/http-errors.js](../backend/utils/http-errors.js)

File kecil ini berisi dua pembuat error yang membawa kode status HTTP. Setiap error berupa objek `Error` biasa dengan tambahan `status`, sehingga penangkap error di `index.js` bisa menerjemahkannya menjadi jawaban yang sesuai ke pengguna, lengkap dengan pesan penjelasnya.

Dipakai oleh rute dan pemeriksa pengaturan, antara lain `findAccessibleAquarium`, `routes/admin.js`, dan `utils/config-validation.js`. Dengan cara ini kode rute cukup melempar error tanpa perlu menyusun jawaban sendiri.

#### `badRequestError`

[http-errors.js:2](../backend/utils/http-errors.js#L2) · fungsi

Membuat error untuk input pengguna yang salah atau tidak lengkap dengan kode 400.

#### `forbiddenError`

[http-errors.js:7](../backend/utils/http-errors.js#L7) · fungsi

Membuat error untuk tindakan yang tidak diizinkan bagi pengguna dengan kode 403.

### backend/utils/notification-records.js

[backend/utils/notification-records.js](../backend/utils/notification-records.js)

File ini berisi alat bantu menulis dan membaca notifikasi di tabel `notifications`. Ada dua jenis notifikasi: notifikasi akuarium, yang terlihat oleh semua orang yang punya akses ke akuarium itu, dan notifikasi pribadi, yang hanya terlihat oleh satu pengguna. Keduanya ditulis lewat sambungan database (`client`) yang diberikan pemanggil, sehingga bisa ikut dalam transaksi yang sedang berjalan.

`addAquariumNotification` menerima kode pembeda opsional (`dedupeKey`). Jika kode yang sama sudah ada untuk akuarium yang sama, notifikasi tidak ditambah lagi, sehingga laporan alat yang terkirim ulang tidak menggandakan notifikasi. `addUserNotification` dipakai untuk kabar pribadi seperti profil atau kata sandi berubah. Selain itu ada potongan aturan pencarian `VISIBLE_NOTIFICATION_CONDITION` untuk memilih notifikasi yang boleh tampil, yaitu milik akuarium atau pengguna yang dimaksud dan belum disembunyikan lewat `notification_states`.

File ini dipakai oleh rute `aquariums`, `auth`, `users`, `hardware`, dan oleh pemantau perangkat.

#### `addAquariumNotification`

[notification-records.js:2](../backend/utils/notification-records.js#L2) · fungsi async

Menambah notifikasi untuk sebuah akuarium agar terlihat oleh orang yang punya akses ke akuarium itu.

#### `addUserNotification`

[notification-records.js:15](../backend/utils/notification-records.js#L15) · fungsi async

Menambah notifikasi pribadi untuk satu pengguna.

### backend/utils/profile-photo-validation.js

[backend/utils/profile-photo-validation.js](../backend/utils/profile-photo-validation.js)

File kecil ini memeriksa foto profil supaya hanya foto yang aman dan tidak terlalu besar yang diterima. Foto boleh dikirim sebagai gambar JPEG berbentuk teks base64 (data URL) dengan ukuran gambar paling besar 180 KB, atau sebagai alamat web http atau https sepanjang maksimal 2048 karakter. Nilai `null` juga diterima dan berarti pengguna tidak memakai foto.

Untuk foto berbentuk teks, panjang teks dibatasi dan isinya diperiksa benar-benar berawal seperti file JPEG, sehingga data lain tidak bisa menyamar sebagai foto. Batas ukuran ini menjaga database tidak penuh oleh foto yang terlalu besar. File ini dipakai oleh `routes/auth.js` dan `routes/users.js` sebelum foto disimpan.

#### `isValidProfilePhotoUrl`

[profile-photo-validation.js:9](../backend/utils/profile-photo-validation.js#L9) · fungsi

Menentukan apakah isian foto profil boleh diterima.

### backend/utils/ttl-cache.js

[backend/utils/ttl-cache.js](../backend/utils/ttl-cache.js)

File ini membuat penyimpanan sementara di memori server yang isinya otomatis dianggap basi setelah waktu tertentu (TTL, singkatan dari time to live). Setiap data disimpan bersama waktu penyimpanannya, dan data yang sudah lewat batas tidak lagi dikembalikan. Jumlah data juga dibatasi (bawaan 500); jika sudah penuh, seluruh isi dikosongkan terlebih dahulu agar memori tidak membengkak.

Selain mengambil dan menyimpan, penyimpanan ini bisa menghapus satu data, menghapus sekelompok data berdasarkan awalan kunci, dan mengosongkan semuanya. Setiap penghapusan menaikkan sebuah penghitung internal. `getOrLoad` memakai penghitung itu untuk mengenali bahwa ada penghapusan ketika ia sedang memuat data, sehingga hasil muatan yang mungkin sudah usang tidak ikut disimpan.

File ini dipakai oleh `middleware/auth.js` untuk menyimpan sementara token, peran pengguna, dan kunci perangkat. Karena datanya hanya ada di memori, semuanya hilang saat server dimatikan, yang aman karena data bisa diambil ulang dari sumber aslinya.

#### `createTtlCache`

[ttl-cache.js:2](../backend/utils/ttl-cache.js#L2) · fungsi

Membuat satu penyimpanan sementara baru dengan lama berlaku dan jumlah maksimal data yang ditentukan.

#### `get`

[ttl-cache.js:8](../backend/utils/ttl-cache.js#L8) · fungsi

Mengambil data yang tersimpan untuk sebuah kunci selama belum basi.

#### `set`

[ttl-cache.js:15](../backend/utils/ttl-cache.js#L15) · fungsi

Menyimpan sebuah nilai beserta waktu saat ini.

#### `delete`

[ttl-cache.js:23](../backend/utils/ttl-cache.js#L23) · fungsi

Menghapus data untuk satu kunci agar data lama segera dilupakan.

#### `deletePrefix`

[ttl-cache.js:27](../backend/utils/ttl-cache.js#L27) · fungsi

Menghapus semua data yang kuncinya diawali teks tertentu.

#### `clear`

[ttl-cache.js:31](../backend/utils/ttl-cache.js#L31) · fungsi

Mengosongkan seluruh isi penyimpanan sementara.

#### `getOrLoad`

[ttl-cache.js:36](../backend/utils/ttl-cache.js#L36) · fungsi async

Mengembalikan data dari penyimpanan jika masih ada, dan jika tidak, mengambilnya dari sumber aslinya lalu menyimpannya.

## Frontend

Aplikasi React (Vite): halaman, komponen, context, hook, dan API client.

### frontend/.env.example

[frontend/.env.example](../frontend/.env.example)

File ini adalah contoh isi pengaturan alamat dan kunci untuk aplikasi tampilan web, yang dibaca Vite lewat `import.meta.env`. Cara memakainya adalah menyalin file ini menjadi `.env` lalu mengisi nilainya. Karena tampilan web berjalan di browser, hanya pengaturan berawalan `VITE_` yang boleh dipakai di dalamnya.

Ada tiga pengaturan. `VITE_API_URL` adalah alamat server backend, contohnya `http://localhost:5000`, dan dipakai oleh backendApi.js. `VITE_SUPABASE_URL` adalah alamat proyek Supabase yang bisa dilihat di Project Settings bagian API di situs Supabase. `VITE_SUPABASE_ANON_KEY` adalah kunci publik Supabase yang memang boleh dipakai di browser, dan keduanya dipakai oleh supabaseAuth.js.

### frontend/.mise.toml

[frontend/.mise.toml](../frontend/.mise.toml)

File ini adalah pengaturan alat mise yang memastikan semua pengembang memakai versi program pendukung yang sama. Isinya menetapkan Node.js versi 22 dan pnpm, pengelola pustaka, versi 10.34.3.

Dengan begitu, siapa pun yang membuka proyek ini dan memakai mise akan otomatis mendapat versi yang cocok, sehingga perbedaan versi tidak menimbulkan masalah yang sulit dilacak.

### frontend/index.html

[frontend/index.html](../frontend/index.html)

File ini adalah halaman HTML pertama yang dimuat browser. Isinya sangat sederhana: pengaturan bahasa dan ukuran layar, warna tema putih, deskripsi situs `Smart Aquarium Control dashboard`, serta judul tab `Smart Aquarium Control`.

Di bagian isi hanya ada satu kotak kosong dengan id `root`, tempat seluruh aplikasi ditampilkan, dan satu skrip `/src/main.jsx` yang memulai aplikasi React. Semua tampilan sesungguhnya dibuat oleh kode di folder src.

### frontend/package.json

[frontend/package.json](../frontend/package.json)

File ini adalah identitas proyek tampilan web (`smart-aquarium-dashboard`, versi 1.0.0) sekaligus daftar pustaka yang dipakai. Pustaka utamanya adalah React 19, React Router 7 untuk perpindahan halaman, dan Supabase untuk login. Alat pengembangannya adalah Vite 8, Tailwind 4, plugin React untuk Vite, dan Prettier untuk merapikan kode.

Perintah singkat yang tersedia ada di bagian scripts dan dijelaskan pada entri di bawah. Proyek ini ditandai `private`, artinya tidak dimaksudkan untuk diterbitkan sebagai paket umum, dan memakai format modul `type: module`.

#### `dev`

[package.json:7](../frontend/package.json#L7) · task

Menjalankan aplikasi dalam mode pengembangan yang langsung berubah di browser saat kode diedit.

#### `build`

[package.json:8](../frontend/package.json#L8) · task

Membuat versi final aplikasi yang siap dipasang ke folder dist.

#### `preview`

[package.json:9](../frontend/package.json#L9) · task

Mencoba hasil build di komputer sendiri sebelum dipasang ke server.

#### `format`

[package.json:10](../frontend/package.json#L10) · task

Merapikan penulisan seluruh kode di folder src secara otomatis.

### frontend/src/api/backendApi.js

[frontend/src/api/backendApi.js](../frontend/src/api/backendApi.js)

File ini adalah satu-satunya pintu komunikasi tampilan web dengan server backend, ditambah urusan login dan pendaftaran yang berjalan lewat layanan Supabase. Isinya dibagi menjadi beberapa kelompok. Kelompok pertama adalah fungsi dasar pengirim permintaan (`requestRaw`, `requestBody`, `sendJson`, `getOrFallbackOn404`) beserta penyusun alamat (`buildAquariumPath`, `buildQueryString`). Kelompok kedua mengurus akun dan sesi: masuk, daftar, ganti password, keluar, dan sinkronisasi profil ke backend.

Kelompok berikutnya adalah permintaan ke backend yang berkaitan dengan data aplikasi. Ada profil pengguna, daftar dan detail akuarium, pengiriman pengaturan suhu, lampu, pemberi pakan, dan sistem, serta perintah memberi pakan sekarang. Ada juga rekaman data sensor (termasuk unduhan CSV dan pengubah data menjadi bentuk grafik), notifikasi, daftar anggota yang punya akses ke akuarium, dan sekelompok fungsi khusus admin untuk mengelola pengguna, akuarium, dan alat. Hampir semua fungsi di sini dipakai oleh AuthContext, App, kedua hook notifikasi, serta halaman Dashboard, History, Notifications, Configuration, dan Access.

Soal sesi dan keamanan, login dan pendaftaran dilakukan langsung ke Supabase. Setelah itu setiap permintaan ke backend otomatis membawa token milik pengguna yang diambil oleh `getAccessToken`, sehingga backend tahu siapa yang meminta. Penanda `authInProgress` dipakai agar AuthContext tidak memuat data sesi dua kali saat proses login masih berjalan. Alamat dasar backend diambil dari pengaturan `VITE_API_URL`, dan kalau tidak diisi dipakai `http://localhost:5000`.

Soal error, kalau koneksi ke backend putus, pesan yang mudah dipahami akan ditampilkan. Kalau backend menolak permintaan, error dilempar bersama kodenya, dan khusus untuk penolakan karena login tidak berlaku, aplikasi memberi sinyal `sa:unauthorized` supaya pengguna dikeluarkan. Beberapa permintaan memakai nilai cadangan kalau backend menjawab data tidak ditemukan (404), sehingga halaman tetap tampil tanpa error. Pesan error asli dari Supabase juga diganti dengan kalimat yang lebih ramah lewat daftar `AUTH_ERROR_MESSAGES`.

#### `getAccessToken`

[backendApi.js:7](../frontend/src/api/backendApi.js#L7) · fungsi async

Mengambil token masuk milik pengguna yang sedang login sebagai bukti identitas ke backend.

#### `isAuthInProgress`

[backendApi.js:15](../frontend/src/api/backendApi.js#L15) · fungsi

Menjawab apakah proses login atau pendaftaran sedang berjalan.

#### `runWithAuthInProgress`

[backendApi.js:18](../frontend/src/api/backendApi.js#L18) · fungsi async

Menjalankan tugas login atau pendaftaran sambil menandai bahwa prosesnya sedang berlangsung.

#### `buildAquariumPath`

[backendApi.js:28](../frontend/src/api/backendApi.js#L28) · fungsi

Menyusun bagian alamat yang menunjuk ke satu akuarium berdasarkan id-nya.

#### `buildQueryString`

[backendApi.js:34](../frontend/src/api/backendApi.js#L34) · fungsi

Mengubah sekumpulan pilihan menjadi tambahan di ujung alamat permintaan.

#### `requestRaw`

[backendApi.js:44](../frontend/src/api/backendApi.js#L44) · fungsi async

Mengirim permintaan ke backend dengan token login dan menangani error koneksi maupun login tidak berlaku.

#### `requestBody`

[backendApi.js:75](../frontend/src/api/backendApi.js#L75) · fungsi async

Mengirim permintaan ke backend dan hanya mengembalikan isi jawabannya.

#### `sendJson`

[backendApi.js:81](../frontend/src/api/backendApi.js#L81) · fungsi

Membantu mengirim data berformat JSON ke backend dengan jenis aksi tertentu.

#### `getOrFallbackOn404`

[backendApi.js:85](../frontend/src/api/backendApi.js#L85) · fungsi async

Meminta data ke backend dan memakai nilai cadangan kalau datanya tidak ditemukan.

#### `toAuthError`

[backendApi.js:106](../frontend/src/api/backendApi.js#L106) · fungsi

Mengubah pesan error dari Supabase menjadi pesan yang lebih ramah dibaca.

#### `syncBackendSession`

[backendApi.js:112](../frontend/src/api/backendApi.js#L112) · fungsi

Memberi tahu backend bahwa pengguna sudah login agar profilnya dibuat atau diambil.

#### `loginWithEmail`

[backendApi.js:115](../frontend/src/api/backendApi.js#L115) · fungsi async

Memeriksa email dan password ke Supabase lalu mengambil profil pengguna dari backend.

#### `registerAccount`

[backendApi.js:123](../frontend/src/api/backendApi.js#L123) · fungsi async

Mendaftarkan akun baru ke Supabase dan membuat profilnya di backend.

#### `changePassword`

[backendApi.js:136](../frontend/src/api/backendApi.js#L136) · fungsi async

Mengganti password pengguna setelah memeriksa password lamanya.

#### `logoutAccount`

[backendApi.js:151](../frontend/src/api/backendApi.js#L151) · fungsi async

Mengakhiri sesi login pengguna di Supabase.

#### `getUserProfile`

[backendApi.js:156](../frontend/src/api/backendApi.js#L156) · fungsi

Meminta data profil seorang pengguna dari backend.

#### `updateUserProfile`

[backendApi.js:159](../frontend/src/api/backendApi.js#L159) · fungsi

Mengirim nama dan foto profil baru pengguna ke backend untuk disimpan.

#### `getAquariumList`

[backendApi.js:163](../frontend/src/api/backendApi.js#L163) · fungsi

Meminta daftar akuarium milik atau yang boleh diakses pengguna.

#### `getAquariumDetail`

[backendApi.js:166](../frontend/src/api/backendApi.js#L166) · fungsi async

Meminta data lengkap satu akuarium beserta pengaturannya.

#### `updateTemperatureConfig`

[backendApi.js:169](../frontend/src/api/backendApi.js#L169) · fungsi async

Mengirim pengaturan suhu baru satu akuarium ke backend.

#### `updateLightingConfig`

[backendApi.js:173](../frontend/src/api/backendApi.js#L173) · fungsi async

Mengirim pengaturan lampu baru satu akuarium ke backend.

#### `updateFeederConfig`

[backendApi.js:177](../frontend/src/api/backendApi.js#L177) · fungsi async

Mengirim pengaturan pemberi pakan baru satu akuarium ke backend.

#### `updateSystemConfig`

[backendApi.js:181](../frontend/src/api/backendApi.js#L181) · fungsi async

Mengirim pengaturan sistem umum satu akuarium ke backend.

#### `triggerFeeder`

[backendApi.js:185](../frontend/src/api/backendApi.js#L185) · fungsi async

Memerintahkan pemberi pakan satu akuarium untuk memberi makan sekarang juga.

#### `getTelemetryRecords`

[backendApi.js:188](../frontend/src/api/backendApi.js#L188) · fungsi async

Meminta rekaman data sensor satu akuarium dari backend.

#### `exportTelemetryCsv`

[backendApi.js:195](../frontend/src/api/backendApi.js#L195) · fungsi async

Meminta backend menyiapkan rekaman data sensor dalam bentuk file CSV.

#### `toTemperatureChartData`

[backendApi.js:205](../frontend/src/api/backendApi.js#L205) · fungsi

Mengubah rekaman data sensor menjadi pasangan jam dan suhu untuk grafik.

#### `getNotifications`

[backendApi.js:220](../frontend/src/api/backendApi.js#L220) · fungsi async

Meminta daftar notifikasi satu akuarium dari backend.

#### `markNotificationRead`

[backendApi.js:226](../frontend/src/api/backendApi.js#L226) · fungsi async

Menandai satu notifikasi sebagai sudah dibaca.

#### `markAllNotificationsRead`

[backendApi.js:230](../frontend/src/api/backendApi.js#L230) · fungsi async

Menandai semua notifikasi satu akuarium sebagai sudah dibaca.

#### `deleteNotification`

[backendApi.js:234](../frontend/src/api/backendApi.js#L234) · fungsi async

Menghapus satu notifikasi dari satu akuarium.

#### `getAquariumMembers`

[backendApi.js:238](../frontend/src/api/backendApi.js#L238) · fungsi async

Meminta daftar orang yang punya akses ke satu akuarium beserta perannya.

#### `getMemberCandidates`

[backendApi.js:241](../frontend/src/api/backendApi.js#L241) · fungsi async

Meminta daftar pengguna yang masih bisa ditambahkan sebagai anggota akuarium.

#### `saveAquariumMember`

[backendApi.js:244](../frontend/src/api/backendApi.js#L244) · fungsi async

Menambahkan anggota baru ke satu akuarium atau mengubah peran anggota yang sudah ada.

#### `removeAquariumMember`

[backendApi.js:248](../frontend/src/api/backendApi.js#L248) · fungsi async

Mencabut akses seorang anggota dari satu akuarium.

#### `adminGetUsers`

[backendApi.js:252](../frontend/src/api/backendApi.js#L252) · fungsi

Meminta daftar semua pengguna terdaftar, khusus untuk admin.

#### `adminSetUserRole`

[backendApi.js:255](../frontend/src/api/backendApi.js#L255) · fungsi

Mengubah peran seorang pengguna di seluruh aplikasi.

#### `adminGetAquariums`

[backendApi.js:259](../frontend/src/api/backendApi.js#L259) · fungsi

Meminta daftar semua akuarium yang terdaftar, khusus untuk admin.

#### `adminCreateAquarium`

[backendApi.js:262](../frontend/src/api/backendApi.js#L262) · fungsi

Membuat akuarium baru lengkap dengan pemiliknya, khusus untuk admin.

#### `adminUpdateAquarium`

[backendApi.js:266](../frontend/src/api/backendApi.js#L266) · fungsi async

Mengubah data satu akuarium, seperti nama atau status pemantauan publik.

#### `adminGetDevices`

[backendApi.js:270](../frontend/src/api/backendApi.js#L270) · fungsi async

Meminta daftar alat yang terdaftar pada satu akuarium.

#### `adminCreateDevice`

[backendApi.js:274](../frontend/src/api/backendApi.js#L274) · fungsi async

Mendaftarkan alat baru ke satu akuarium agar bisa mengirim data.

#### `adminRevokeDevice`

[backendApi.js:278](../frontend/src/api/backendApi.js#L278) · fungsi

Mencabut izin sebuah alat agar tidak bisa lagi mengirim data.

### frontend/src/App.jsx

[frontend/src/App.jsx](../frontend/src/App.jsx)

File ini adalah kerangka utama aplikasi yang menentukan halaman mana yang muncul untuk tiap alamat, seperti login, register, dashboard, riwayat, notifikasi, konfigurasi, dan akses. Di sini juga diatur siapa yang boleh membuka tiap halaman. Halaman login dan register terbuka untuk siapa saja, sedangkan halaman lain wajib login dan tampil di dalam tata letak utama `AppLayout`.

Aturan akses dibedakan menurut peran. Halaman Access hanya untuk admin atau owner, sedangkan dashboard, riwayat, dan notifikasi butuh akuarium aktif. Pengguna viewer tidak boleh membuka riwayat dan notifikasi sehingga dialihkan ke dashboard, dan pengguna yang belum punya akuarium melihat layar pesan agar menghubungi admin. Halaman dimuat ulang bersih saat akuarium aktif diganti.

File ini juga menyimpan beberapa hal yang dipakai bersama antarhalaman: jumlah notifikasi belum dibaca untuk lencana menu, pengaturan notifikasi peramban, dan pesan sukses berupa banner hijau yang hilang sendiri sekitar 5 detik. Untuk viewer, bagian notifikasi tidak diikuti karena viewer tidak menerima peringatan. File ini dijalankan oleh `main.jsx` dan memakai data login, `AppLayout`, serta semua halaman di folder `pages/`.

#### `ProtectedRoute`

[App.jsx:19](../frontend/src/App.jsx#L19) · komponen

Penjaga halaman yang hanya boleh dibuka setelah login, dan mengirim pengguna yang belum login ke halaman login.

#### `NoAquariumNotice`

[App.jsx:32](../frontend/src/App.jsx#L32) · komponen

Layar pesan untuk pengguna yang belum punya akuarium, berisi permintaan menghubungi admin dan tombol keluar.

#### `AppRoutes`

[App.jsx:49](../frontend/src/App.jsx#L49) · komponen

Peta semua halaman aplikasi beserta aturan siapa yang boleh membukanya.

#### `showSuccessNotice`

[App.jsx:66](../frontend/src/App.jsx#L66) · handler

Memunculkan pesan sukses di layar dan memberi tanda agar daftar notifikasi diperbarui.

#### `App`

[App.jsx:141](../frontend/src/App.jsx#L141) · komponen

Pembungkus terluar aplikasi yang menyalakan sistem alamat halaman dan sistem login untuk semua halaman.

### frontend/src/components/access/AccessUiParts.jsx

[frontend/src/components/access/AccessUiParts.jsx](../frontend/src/components/access/AccessUiParts.jsx)

File ini berisi kumpulan potongan tampilan kecil yang dipakai bersama di halaman Access: kartu pembungkus bagian (`SectionCard`), pesan status (`StatusMessages`), baris orang (`PersonRow`), tulisan daftar kosong (`EmptyState`), dan tombol kecil (`SmallButton`). Ada juga aturan tampilan bersama untuk kolom isian dan kotak pilihan agar semua formulir terlihat seragam.

Selain itu ada hook `useApiAction` yang membungkus setiap permintaan ke server di halaman Access. Hook ini mencatat apakah proses sedang berjalan, pesan sukses, atau pesan galat, sehingga tombol dinonaktifkan selama menunggu dan pengguna selalu melihat hasil aksinya.

File ini dipakai oleh `AddPersonPanel`, `AdminAccess`, `AquariumPeople`, `AquariumSummary`, `DevicesSection`, `NewAquariumForm`, `OwnerAccess`, dan `UsersTab`. Dengan begitu tampilan dan perilaku halaman Access konsisten di semua bagiannya.

#### `useApiAction`

[AccessUiParts.jsx:9](../frontend/src/components/access/AccessUiParts.jsx#L9) · hook

Membungkus permintaan ke server dan mencatat status sibuk, pesan sukses, atau pesan galat.

#### `runApiAction`

[AccessUiParts.jsx:15](../frontend/src/components/access/AccessUiParts.jsx#L15) · fungsi async

Menjalankan satu aksi ke server dan mencatat hasilnya sebagai pesan sukses atau galat.

#### `SectionCard`

[AccessUiParts.jsx:34](../frontend/src/components/access/AccessUiParts.jsx#L34) · komponen

Kartu pembungkus satu bagian halaman dengan judul, keterangan, tombol opsional, dan isi.

#### `StatusMessages`

[AccessUiParts.jsx:50](../frontend/src/components/access/AccessUiParts.jsx#L50) · komponen

Menampilkan kotak peringatan merah bila ada galat dan kotak hijau bila aksi terakhir berhasil.

#### `PersonRow`

[AccessUiParts.jsx:60](../frontend/src/components/access/AccessUiParts.jsx#L60) · komponen

Satu baris daftar untuk seseorang dengan huruf awal, nama, email, dan ruang untuk tombol aksi.

#### `EmptyState`

[AccessUiParts.jsx:79](../frontend/src/components/access/AccessUiParts.jsx#L79) · komponen

Tulisan abu-abu singkat yang tampil saat sebuah daftar masih kosong.

#### `SmallButton`

[AccessUiParts.jsx:84](../frontend/src/components/access/AccessUiParts.jsx#L84) · komponen

Tombol kecil dengan gaya biasa, utama, atau bahaya untuk aksi seperti hapus.

### frontend/src/components/access/AddPersonPanel.jsx

[frontend/src/components/access/AddPersonPanel.jsx](../frontend/src/components/access/AddPersonPanel.jsx)

Panel kecil ini dipakai untuk menambah orang ke sebuah akuarium. Saat tertutup hanya ada tombol tambah; saat dibuka muncul kolom cari dan daftar calon, dan tiap baris punya tombol Add. Pencarian cocok dengan nama atau email tanpa membedakan huruf besar dan kecil, dan bila kolom cari kosong semua calon ditampilkan.

Panel ini tidak menghubungi server sendiri. Ia hanya memberi tahu induknya, yaitu `AquariumPeople`, siapa yang dipilih, dan induknya yang menyimpan ke server sebagai owner atau member.

#### `AddPersonPanel`

[AddPersonPanel.jsx:5](../frontend/src/components/access/AddPersonPanel.jsx#L5) · komponen

Panel yang bisa dibuka untuk mencari calon dari daftar pengguna dan memilih siapa yang ditambahkan.

### frontend/src/components/access/AdminAccess.jsx

[frontend/src/components/access/AdminAccess.jsx](../frontend/src/components/access/AdminAccess.jsx)

Ini adalah tampilan halaman Access untuk admin, dengan dua tab: Aquariums untuk mengatur akuarium dan Users untuk mengatur pengguna. Pada tab Aquariums ada dua kolom. Di kiri terdapat daftar semua akuarium (nama, ID, pemilik, jumlah orang dan perangkat) serta tombol atau formulir akuarium baru. Di kanan terdapat ringkasan, daftar orang, dan perangkat milik akuarium yang dipilih.

Daftar akuarium diambil lewat `adminGetAquariums` dari `backendApi.js`. Setelah ada perubahan, seperti ganti nama, tambah orang, atau akuarium baru dibuat, daftar dimuat ulang dan data akuarium milik pengguna disegarkan lewat `refreshAquariums` dari `useAuth`, supaya menu ikut diperbarui. Pilihan akuarium dipertahankan setelah muat ulang bila akuarium itu masih ada, dan bila tidak, akuarium pertama yang dipilih.

Bila belum ada akuarium sama sekali, formulir akuarium baru selalu tampil dan tombol Cancel disembunyikan, karena admin harus membuat akuarium dulu. Tampilan ini dipanggil oleh `AccessPage` hanya untuk admin, dan menyusun `AquariumSummary`, `AquariumPeople`, `DevicesSection`, `NewAquariumForm`, serta `UsersTab`.

#### `AquariumList`

[AdminAccess.jsx:19](../frontend/src/components/access/AdminAccess.jsx#L19) · komponen

Daftar akuarium dalam bentuk tombol yang bisa diklik untuk memilih satu akuarium.

#### `AdminAccess`

[AdminAccess.jsx:56](../frontend/src/components/access/AdminAccess.jsx#L56) · komponen

Tampilan admin utuh dengan tab Aquariums dan Users.

#### `loadAdminAquariums`

[AdminAccess.jsx:66](../frontend/src/components/access/AdminAccess.jsx#L66) · fungsi

Mengambil daftar akuarium dari server lalu memperbarui daftar dan akuarium yang dipilih.

#### `handleAquariumDataChanged`

[AdminAccess.jsx:88](../frontend/src/components/access/AdminAccess.jsx#L88) · handler

Memuat ulang daftar dan menyegarkan data akuarium setelah ada perubahan pada akuarium.

#### `handleAquariumCreated`

[AdminAccess.jsx:94](../frontend/src/components/access/AdminAccess.jsx#L94) · handler

Menutup formulir, memuat ulang daftar, dan langsung memilih akuarium yang baru dibuat.

### frontend/src/components/access/AquariumPeople.jsx

[frontend/src/components/access/AquariumPeople.jsx](../frontend/src/components/access/AquariumPeople.jsx)

Bagian ini menampilkan siapa saja yang punya akses ke sebuah akuarium dalam dua kartu: Owners (hanya terlihat oleh admin) dan Members. Tiap orang tampil dengan lencana peran dan tombol Remove, dan di tiap kartu ada panel untuk menambah orang baru lewat `AddPersonPanel`.

Daftar anggota dan calon yang bisa ditambahkan diambil bersamaan lewat `getAquariumMembers` dan `getMemberCandidates` dari `backendApi.js`. Menambah orang memakai `saveAquariumMember`, dan mencabut akses memakai `removeAquariumMember` setelah pengguna ditanya untuk memastikan. Setiap perubahan diikuti muat ulang daftar dan pemberitahuan ke induknya supaya tampilan lain ikut diperbarui.

Komponen ini dipakai oleh `AdminAccess` untuk admin dan oleh `OwnerAccess` untuk owner. Owner hanya mengatur member, sedangkan pengaturan owner khusus untuk admin.

#### `AquariumPeople`

[AquariumPeople.jsx:14](../frontend/src/components/access/AquariumPeople.jsx#L14) · komponen

Menampilkan kartu Owners dan Members beserta tombol untuk menambah dan menghapus orang.

#### `loadPeople`

[AquariumPeople.jsx:22](../frontend/src/components/access/AquariumPeople.jsx#L22) · fungsi async

Mengambil daftar anggota dan calon dari server lalu menampilkannya.

#### `handleAddPerson`

[AquariumPeople.jsx:43](../frontend/src/components/access/AquariumPeople.jsx#L43) · handler

Menambahkan calon yang dipilih ke akuarium sebagai owner atau member lalu memuat ulang daftar.

#### `handleRemovePerson`

[AquariumPeople.jsx:56](../frontend/src/components/access/AquariumPeople.jsx#L56) · handler

Mencabut akses seseorang dari akuarium setelah pengguna menyetujui pertanyaan konfirmasi.

#### `renderPersonList`

[AquariumPeople.jsx:72](../frontend/src/components/access/AquariumPeople.jsx#L72) · fungsi

Menggambar daftar orang sebagai baris dengan lencana peran dan tombol Remove, atau keterangan bila kosong.

### frontend/src/components/access/AquariumSummary.jsx

[frontend/src/components/access/AquariumSummary.jsx](../frontend/src/components/access/AquariumSummary.jsx)

Ini adalah kartu Overview satu akuarium untuk admin. Isinya ID akuarium, kolom untuk mengganti nama, dan sakelar Public monitoring for viewers yang menentukan apakah viewer boleh memantau akuarium ini.

Perubahan nama dan sakelar dikirim ke server lewat `adminUpdateAquarium` dari `backendApi.js`. Nama baru hanya dikirim bila memang berubah, dan setelah berhasil induknya diberi tahu agar daftar dan tampilan lain ikut diperbarui. Kartu ini dipakai oleh `AdminAccess` dan hanya terlihat oleh admin.

#### `AquariumSummary`

[AquariumSummary.jsx:7](../frontend/src/components/access/AquariumSummary.jsx#L7) · komponen

Kartu ringkasan akuarium untuk mengganti nama dan mengatur pemantauan publik bagi viewer.

#### `saveAquariumName`

[AquariumSummary.jsx:13](../frontend/src/components/access/AquariumSummary.jsx#L13) · handler

Menyimpan nama akuarium baru ke server bila nama berubah.

#### `togglePublicMonitoring`

[AquariumSummary.jsx:21](../frontend/src/components/access/AquariumSummary.jsx#L21) · handler

Menyimpan pilihan pemantauan publik yang baru ke server saat sakelar digeser.

### frontend/src/components/access/DevicesSection.jsx

[frontend/src/components/access/DevicesSection.jsx](../frontend/src/components/access/DevicesSection.jsx)

Bagian ini dipakai untuk mengelola perangkat ESP32, yaitu alat pengendali akuarium, milik satu akuarium. Admin bisa melihat daftar perangkat, mendaftarkan perangkat baru lewat formulir nama, dan mencabut perangkat dengan tombol Revoke. Karena satu akuarium hanya boleh punya satu perangkat, formulir pendaftaran hanya muncul bila akuarium belum punya perangkat.

Saat perangkat baru dibuat, server mengembalikan kunci rahasia perangkat. Kunci ini ditampilkan hanya satu kali agar bisa disalin ke papan klip lewat tombol salin, dan hilang dari layar saat admin pindah ke akuarium lain. Kunci itulah yang nantinya dimasukkan ke perangkat agar bisa mengirim data.

Data diambil dan disimpan lewat `adminGetDevices`, `adminCreateDevice`, dan `adminRevokeDevice` dari `backendApi.js`. Mencabut perangkat meminta konfirmasi dulu. Bagian ini dipakai oleh `AdminAccess` dan hanya terlihat oleh admin.

#### `DevicesSection`

[DevicesSection.jsx:7](../frontend/src/components/access/DevicesSection.jsx#L7) · komponen

Menampilkan kunci perangkat baru, daftar perangkat, dan formulir pendaftaran perangkat.

#### `loadDevices`

[DevicesSection.jsx:17](../frontend/src/components/access/DevicesSection.jsx#L17) · fungsi

Mengambil daftar perangkat akuarium dari server lalu menampilkannya.

#### `handleRegisterDevice`

[DevicesSection.jsx:36](../frontend/src/components/access/DevicesSection.jsx#L36) · handler

Mendaftarkan perangkat baru ke server dan menampilkan kunci perangkatnya agar bisa disalin.

#### `handleRevokeDevice`

[DevicesSection.jsx:49](../frontend/src/components/access/DevicesSection.jsx#L49) · handler

Mencabut akses sebuah perangkat di server setelah pengguna menyetujui konfirmasi.

#### `copyDeviceKey`

[DevicesSection.jsx:58](../frontend/src/components/access/DevicesSection.jsx#L58) · handler

Menyalin kunci perangkat ke papan klip dan menandai tombol bila berhasil.

### frontend/src/components/access/NewAquariumForm.jsx

[frontend/src/components/access/NewAquariumForm.jsx](../frontend/src/components/access/NewAquariumForm.jsx)

Ini adalah formulir bagi admin untuk membuat akuarium baru. Isinya kolom nama, ID khusus yang boleh dikosongkan (huruf, angka, tanda minus, dan garis bawah, sampai 64 karakter), dan pilihan owner. Bila ID dikosongkan, server membuat ID acak sendiri.

Saat formulir dibuka, ia mengambil semua pengguna non-admin lewat `adminGetUsers` sebagai calon owner. Saat dikirim, data dikirim lewat `adminCreateAquarium` dari `backendApi.js`, dan kolom yang dikosongkan tidak ikut dikirim. Setelah berhasil, induknya diberi tahu ID akuarium baru agar langsung dipilih. Tombol Cancel hanya ada bila formulir boleh ditutup. Formulir ini dipakai oleh `AdminAccess` dan hanya untuk admin.

#### `NewAquariumForm`

[NewAquariumForm.jsx:6](../frontend/src/components/access/NewAquariumForm.jsx#L6) · komponen

Formulir untuk membuat akuarium baru dengan nama, ID opsional, dan owner.

#### `handleCreateAquarium`

[NewAquariumForm.jsx:22](../frontend/src/components/access/NewAquariumForm.jsx#L22) · handler

Mengirim data akuarium baru ke server dan memberi tahu induknya bila berhasil.

### frontend/src/components/access/OwnerAccess.jsx

[frontend/src/components/access/OwnerAccess.jsx](../frontend/src/components/access/OwnerAccess.jsx)

Ini adalah tampilan halaman Access untuk owner. Owner memilih salah satu akuarium miliknya, lalu mengatur member akuarium itu. Daftar akuarium diambil dari data login, tanpa permintaan baru ke server.

Bila owner belum punya akuarium, tampil pesan bahwa belum ada akuarium. Bila punya lebih dari satu, tampil kotak pilihan akuarium, dan akuarium pertama dipilih bila belum ada pilihan. Seluruh pengambilan dan penyimpanan daftar orang dikerjakan `AquariumPeople`, tanpa fitur khusus admin seperti mengatur owner. Tampilan ini dipanggil oleh `AccessPage`.

#### `OwnerAccess`

[OwnerAccess.jsx:7](../frontend/src/components/access/OwnerAccess.jsx#L7) · komponen

Tampilan owner untuk memilih akuarium miliknya dan mengatur member-nya.

### frontend/src/components/access/UsersTab.jsx

[frontend/src/components/access/UsersTab.jsx](../frontend/src/components/access/UsersTab.jsx)

Ini adalah tab Users pada halaman Access untuk admin. Isinya kolom cari (berdasarkan nama atau email) dan daftar semua pengguna, tiap orang dengan akuarium yang terkait, lencana peran, dan tombol Make admin atau Remove admin.

Daftar diambil lewat `adminGetUsers` dan peran diubah lewat `adminSetUserRole` dari `backendApi.js`. Sebelum menjadikan seseorang admin, pengguna ditanya dulu untuk memastikan, dan setelah berhasil daftar dimuat ulang. Tombol peran tidak muncul untuk akun admin yang sedang dipakai sendiri, supaya admin tidak mencabut perannya sendiri. Tab ini dipakai oleh `AdminAccess` dan hanya untuk admin.

#### `UsersTab`

[UsersTab.jsx:17](../frontend/src/components/access/UsersTab.jsx#L17) · komponen

Menampilkan pencarian dan daftar semua pengguna dengan tombol untuk mengubah peran admin.

#### `loadUsers`

[UsersTab.jsx:26](../frontend/src/components/access/UsersTab.jsx#L26) · fungsi

Mengambil daftar semua pengguna dari server lalu menampilkannya.

#### `toggleAdminRole`

[UsersTab.jsx:43](../frontend/src/components/access/UsersTab.jsx#L43) · handler

Membalik peran seseorang antara admin dan pengguna biasa lalu memuat ulang daftar.

### frontend/src/components/AppLayout.jsx

[frontend/src/components/AppLayout.jsx](../frontend/src/components/AppLayout.jsx)

File ini adalah kerangka tampilan semua halaman setelah login. Isinya menu samping yang bisa dilipat untuk komputer, bagian atas halaman dengan pilihan akuarium, lencana peran, dan foto pengguna, menu bawah untuk ponsel, serta tempat menampilkan pesan sukses. Daftar menunya adalah Dashboard, History, Alerts, Config, dan Access, dan warna latar menu samping dan bagian atas dibuat sama, yaitu biru tua `#0d1b4b`.

Menu yang tampil disesuaikan dengan keadaan pengguna. Dashboard, History, dan Alerts hanya muncul kalau ada akuarium yang dipakai, dan History serta Alerts disembunyikan untuk pengguna berperan viewer. Config selalu muncul, dan Access hanya muncul kalau pengguna admin atau pemilik suatu akuarium. Komponen ini dipasang di App.jsx untuk semua halaman yang butuh login, dan tombol keluarnya memakai `signOut` dari AuthContext.

#### `UnreadBadge`

[AppLayout.jsx:37](../frontend/src/components/AppLayout.jsx#L37) · komponen

Titik merah kecil di ikon menu Alerts yang menunjukkan jumlah notifikasi belum dibaca.

#### `AppLayout`

[AppLayout.jsx:47](../frontend/src/components/AppLayout.jsx#L47) · komponen

Kerangka halaman berisi menu samping, bagian atas, menu bawah, dan pesan sukses.

#### `isNavPathActive`

[AppLayout.jsx:73](../frontend/src/components/AppLayout.jsx#L73) · fungsi

Memeriksa apakah sebuah menu sedang aktif sesuai halaman yang dibuka.

#### `handleSignOut`

[AppLayout.jsx:77](../frontend/src/components/AppLayout.jsx#L77) · handler

Mengeluarkan pengguna lalu mengalihkannya ke halaman login.

### frontend/src/components/ErrorBoundary.jsx

[frontend/src/components/ErrorBoundary.jsx](../frontend/src/components/ErrorBoundary.jsx)

File ini berisi penjaga yang mencegah layar menjadi putih kosong kalau ada bagian tampilan yang rusak. Kalau terjadi kerusakan saat menggambar tampilan, penjaga ini menampilkan kartu `Something went wrong` lengkap dengan pesan kesalahan dan tombol Reload. Kalau tidak ada masalah, isi aplikasi ditampilkan seperti biasa.

Komponen ini membungkus seluruh aplikasi di main.jsx. Detail error dan jejak asalnya juga dicatat ke konsol browser sehingga pengembang bisa menelusuri penyebabnya. Tombol Reload membawa pengguna kembali ke halaman utama.

#### `ErrorBoundary`

[ErrorBoundary.jsx:4](../frontend/src/components/ErrorBoundary.jsx#L4) · komponen

Penjaga yang menampilkan kartu pesan kesalahan kalau ada tampilan yang rusak.

#### `getDerivedStateFromError`

[ErrorBoundary.jsx:7](../frontend/src/components/ErrorBoundary.jsx#L7) · fungsi

Menyimpan error yang tertangkap agar tampilan berganti ke kartu pesan kesalahan.

#### `componentDidCatch`

[ErrorBoundary.jsx:11](../frontend/src/components/ErrorBoundary.jsx#L11) · fungsi

Mencatat detail error ke konsol browser agar pengembang bisa menelusurinya.

#### `render`

[ErrorBoundary.jsx:15](../frontend/src/components/ErrorBoundary.jsx#L15) · fungsi

Menentukan apakah isi aplikasi atau kartu pesan kesalahan yang tampil.

### frontend/src/components/Icons.jsx

[frontend/src/components/Icons.jsx](../frontend/src/components/Icons.jsx)

File ini berisi kumpulan ikon sederhana yang digambar langsung di dalam kode (SVG), tanpa memakai pustaka ikon dari luar. Semua ikon dibuat dari satu bingkai dasar, `IconFrame`, yang berukuran 24 kali 24, bergaya garis, dan berwarna mengikuti teks di sekitarnya. Karena itu warna dan ukuran ikon mudah disesuaikan dari tempat pemakaiannya.

Ikon-ikon ini dipakai di berbagai tempat. Ikon menu navigasi (Dashboard, History, Alerts, Config, Access) dan tombol keluar ada di AppLayout, ikon lambang ikan ada di AppLayout serta halaman Login dan Register, dan ikon surat, gembok, mata, serta kamera dipakai di kolom isian dan tombol foto profil. Ada pula ikon tombol seperti centang, tambah, hapus, unduh, dan cari di halaman Dashboard, History, dan Notifications, sedangkan sebagian lainnya dipakai lewat `InputField` di UiKit.

#### `IconFrame`

[Icons.jsx:2](../frontend/src/components/Icons.jsx#L2) · komponen

Bingkai dasar untuk semua ikon berbentuk garis di file ini.

#### `FishIcon`

[Icons.jsx:17](../frontend/src/components/Icons.jsx#L17) · komponen

Ikon ikan yang menjadi lambang aplikasi.

#### `DashboardIcon`

[Icons.jsx:30](../frontend/src/components/Icons.jsx#L30) · komponen

Ikon kisi empat kotak untuk menu Dashboard.

#### `HistoryIcon`

[Icons.jsx:40](../frontend/src/components/Icons.jsx#L40) · komponen

Ikon jam untuk menu History.

#### `BellIcon`

[Icons.jsx:48](../frontend/src/components/Icons.jsx#L48) · komponen

Ikon lonceng untuk menu Alerts.

#### `SettingsIcon`

[Icons.jsx:56](../frontend/src/components/Icons.jsx#L56) · komponen

Ikon roda gigi untuk menu Config.

#### `LogoutIcon`

[Icons.jsx:64](../frontend/src/components/Icons.jsx#L64) · komponen

Ikon pintu dengan panah keluar untuk tombol Sign Out.

#### `ChevronLeftIcon`

[Icons.jsx:73](../frontend/src/components/Icons.jsx#L73) · komponen

Ikon panah kiri untuk menciutkan menu samping dan ke halaman sebelumnya.

#### `ChevronRightIcon`

[Icons.jsx:80](../frontend/src/components/Icons.jsx#L80) · komponen

Ikon panah kanan untuk melebarkan menu samping dan ke halaman berikutnya.

#### `UserIcon`

[Icons.jsx:87](../frontend/src/components/Icons.jsx#L87) · komponen

Ikon siluet manusia untuk menu Access dan kolom nama.

#### `MailIcon`

[Icons.jsx:95](../frontend/src/components/Icons.jsx#L95) · komponen

Ikon amplop untuk kolom isian email.

#### `LockIcon`

[Icons.jsx:103](../frontend/src/components/Icons.jsx#L103) · komponen

Ikon gembok untuk kolom isian password.

#### `CameraIcon`

[Icons.jsx:111](../frontend/src/components/Icons.jsx#L111) · komponen

Ikon kamera untuk tombol memilih foto profil.

#### `EyeIcon`

[Icons.jsx:119](../frontend/src/components/Icons.jsx#L119) · komponen

Ikon mata untuk menampilkan password yang tersembunyi.

#### `EyeOffIcon`

[Icons.jsx:127](../frontend/src/components/Icons.jsx#L127) · komponen

Ikon mata dicoret untuk menyembunyikan kembali password.

#### `CheckIcon`

[Icons.jsx:135](../frontend/src/components/Icons.jsx#L135) · komponen

Ikon centang untuk tanda sudah dibaca.

#### `PlusIcon`

[Icons.jsx:142](../frontend/src/components/Icons.jsx#L142) · komponen

Ikon tanda plus untuk tombol menambah sesuatu.

#### `TrashIcon`

[Icons.jsx:150](../frontend/src/components/Icons.jsx#L150) · komponen

Ikon tempat sampah untuk tombol menghapus sesuatu.

#### `DownloadIcon`

[Icons.jsx:158](../frontend/src/components/Icons.jsx#L158) · komponen

Ikon unduh untuk tombol mengunduh data CSV.

#### `SearchIcon`

[Icons.jsx:167](../frontend/src/components/Icons.jsx#L167) · komponen

Ikon kaca pembesar untuk kolom pencarian di halaman History.

### frontend/src/components/RoleBadge.jsx

[frontend/src/components/RoleBadge.jsx](../frontend/src/components/RoleBadge.jsx)

File ini berisi lencana kecil berwarna untuk menampilkan peran seseorang: `admin`, `owner`, `member`, `viewer`, atau `user`. Setiap peran punya warna latar dan tulisan sendiri sehingga mudah dibedakan sekilas.

Lencana ini dipakai di halaman Configuration, komponen AquariumPeople, dan UsersTab. Kalau peran tidak dikenal, warna milik `viewer` yang dipakai. Lencana di bagian atas halaman AppLayout memakai pengaturan warna terpisah karena latarnya gelap.

#### `RoleBadge`

[RoleBadge.jsx:11](../frontend/src/components/RoleBadge.jsx#L11) · komponen

Lencana berwarna yang menampilkan peran seseorang.

### frontend/src/components/TemperatureAreaChart.jsx

[frontend/src/components/TemperatureAreaChart.jsx](../frontend/src/components/TemperatureAreaChart.jsx)

File ini berisi grafik suhu berbentuk area yang digambar sendiri dengan SVG tanpa pustaka grafik. Grafik terdiri dari garis suhu, warna gradasi di bawah garis, sumbu suhu di kiri dengan tiga angka penanda, label jam di bawah, dan titik data. Kalau datanya kosong, tampil tulisan `No Data`.

Grafik ini dipakai di halaman Dashboard dengan data dari `toTemperatureChartData` di backendApi.js. Lebarnya mengikuti lebar kotak pembungkus dan dipantau terus, jadi grafik tetap pas saat layar berubah ukuran, misalnya ketika ponsel diputar. Rentang sumbu suhu diambil dari suhu terendah dan tertinggi dalam data, ditambah ruang satu derajat, dan jumlah label jam dibatasi sekitar enam supaya tidak berdesakan.

#### `TemperatureAreaChart`

[TemperatureAreaChart.jsx:4](../frontend/src/components/TemperatureAreaChart.jsx#L4) · komponen

Menggambar grafik suhu berbentuk area dari data jam dan suhu.

#### `scaleX`

[TemperatureAreaChart.jsx:48](../frontend/src/components/TemperatureAreaChart.jsx#L48) · fungsi

Menentukan posisi mendatar sebuah titik data di grafik.

#### `scaleY`

[TemperatureAreaChart.jsx:50](../frontend/src/components/TemperatureAreaChart.jsx#L50) · fungsi

Menentukan posisi tegak sebuah titik data di grafik berdasarkan suhunya.

### frontend/src/components/UiKit.jsx

[frontend/src/components/UiKit.jsx](../frontend/src/components/UiKit.jsx)

File ini adalah kumpulan bagian tampilan kecil yang dipakai berulang di banyak tempat: jam yang berjalan, saklar hidup-mati, lencana status, kotak informasi, kartu, tombol utama, kolom isian, penggeser angka, pemilih mode, kotak pesan error dan sukses, judul halaman, dan lingkaran pemuatan. Dengan memusatkannya di satu file, tampilan semua halaman tetap seragam.

Hampir semua halaman dan komponen akses memakai file ini. Misalnya `InputField` dipakai di halaman Login, Register, dan Configuration, `RangeSlider` dan `ModeSelector` dipakai untuk mengatur suhu dan lampu, dan `PageHeader` menjadi judul di bagian atas tiap halaman. Komponen di sini hanya mengurus tampilan dan menerima data serta aksi dari halaman yang memakainya.

#### `LiveClock`

[UiKit.jsx:4](../frontend/src/components/UiKit.jsx#L4) · komponen

Jam dan tanggal yang berjalan setiap detik sesuai zona waktu tertentu.

#### `ToggleSwitch`

[UiKit.jsx:43](../frontend/src/components/UiKit.jsx#L43) · komponen

Saklar hidup-mati yang bisa diklik dan dibaca alat bantu pembaca layar.

#### `StatusBadge`

[UiKit.jsx:66](../frontend/src/components/UiKit.jsx#L66) · komponen

Lencana kecil yang menampilkan status dengan warna sesuai keadaannya.

#### `InfoField`

[UiKit.jsx:81](../frontend/src/components/UiKit.jsx#L81) · komponen

Kotak berisi judul dan nilai yang hanya bisa dibaca.

#### `Card`

[UiKit.jsx:93](../frontend/src/components/UiKit.jsx#L93) · komponen

Kotak putih bersudut membulat sebagai wadah isi halaman.

#### `PrimaryButton`

[UiKit.jsx:98](../frontend/src/components/UiKit.jsx#L98) · komponen

Tombol utama berwarna biru selebar penuh.

#### `InputField`

[UiKit.jsx:112](../frontend/src/components/UiKit.jsx#L112) · komponen

Kolom isian teks lengkap dengan judul, ikon, dan petunjuk.

#### `RangeSlider`

[UiKit.jsx:158](../frontend/src/components/UiKit.jsx#L158) · komponen

Penggeser untuk memilih angka dengan nilai terkecil dan terbesar di ujungnya.

#### `ModeSelector`

[UiKit.jsx:200](../frontend/src/components/UiKit.jsx#L200) · komponen

Dua tombol pilihan untuk memilih mode kontrol manual atau otomatis.

#### `ErrorAlert`

[UiKit.jsx:221](../frontend/src/components/UiKit.jsx#L221) · komponen

Kotak merah untuk menampilkan pesan kesalahan kepada pengguna.

#### `SuccessAlert`

[UiKit.jsx:232](../frontend/src/components/UiKit.jsx#L232) · komponen

Kotak hijau untuk menampilkan pesan berhasil kepada pengguna.

#### `PageHeader`

[UiKit.jsx:243](../frontend/src/components/UiKit.jsx#L243) · komponen

Judul di bagian atas halaman, lengkap dengan keterangan dan jam bila diberikan.

#### `LoadingSpinner`

[UiKit.jsx:259](../frontend/src/components/UiKit.jsx#L259) · komponen

Lingkaran berputar sebagai tanda data sedang dimuat.

### frontend/src/context/AuthContext.jsx

[frontend/src/context/AuthContext.jsx](../frontend/src/context/AuthContext.jsx)

File ini menyimpan dan membagikan status login ke seluruh aplikasi: siapa pengguna yang sedang masuk, daftar akuarium miliknya, akuarium yang sedang dipilih, serta hak akses pengguna. Pembungkusnya adalah `AuthProvider`, yang dipasang di main.jsx, sedangkan halaman dan komponen lain membacanya lewat hook `useAuth`. Pilihan akuarium terakhir diingat di browser dengan nama penyimpanan `sa_active_aquarium`, sehingga tetap sama walaupun halaman dimuat ulang.

Saat aplikasi dibuka, `loadSavedSession` memulihkan login yang tersimpan: backend diberi tahu lewat `syncBackendSession`, lalu profil dan daftar akuarium dimuat. Selama itu berlangsung halaman yang butuh login ditahan dulu supaya tidak sempat tampil salah. Kalau backend menolak karena login tidak berlaku, atau muncul sinyal `sa:unauthorized`, pengguna dikeluarkan dan semua data login dibersihkan.

Dari peran pengguna, file ini juga menurunkan beberapa penanda hak akses yang dibagikan ke aplikasi. Admin boleh membuka halaman Access dan mengelola semua akuarium. Pemilik (`owner`) boleh mengatur siapa yang punya akses ke akuariumnya. Peran `member`, `owner`, dan `admin` boleh mengubah pengaturan, sedangkan `viewer` hanya boleh melihat, dan AppLayout menyembunyikan menu History dan Alerts untuknya.

#### `isBlobUrl`

[AuthContext.jsx:17](../frontend/src/context/AuthContext.jsx#L17) · fungsi

Memeriksa apakah alamat foto hanya berupa alamat sementara milik browser.

#### `readStoredAquariumId`

[AuthContext.jsx:20](../frontend/src/context/AuthContext.jsx#L20) · fungsi

Membaca id akuarium terakhir yang dipilih dari penyimpanan browser.

#### `storeActiveAquariumId`

[AuthContext.jsx:29](../frontend/src/context/AuthContext.jsx#L29) · fungsi

Menyimpan id akuarium yang dipilih ke penyimpanan browser atau menghapusnya.

#### `AuthProvider`

[AuthContext.jsx:39](../frontend/src/context/AuthContext.jsx#L39) · komponen

Pembungkus yang menyimpan data login dan membagikannya ke seluruh aplikasi.

#### `loadAquariumList`

[AuthContext.jsx:47](../frontend/src/context/AuthContext.jsx#L47) · fungsi async

Memuat daftar akuarium pengguna lalu menyimpannya di ingatan aplikasi.

#### `completeSignIn`

[AuthContext.jsx:54](../frontend/src/context/AuthContext.jsx#L54) · fungsi async

Menyimpan profil pengguna dan memuat daftar akuariumnya setelah masuk berhasil.

#### `clearAuthState`

[AuthContext.jsx:63](../frontend/src/context/AuthContext.jsx#L63) · fungsi

Mengosongkan data pengguna dan daftar akuarium dari ingatan aplikasi.

#### `signOut`

[AuthContext.jsx:69](../frontend/src/context/AuthContext.jsx#L69) · fungsi async

Mengeluarkan pengguna dan membersihkan data login di aplikasi.

#### `loadSavedSession`

[AuthContext.jsx:82](../frontend/src/context/AuthContext.jsx#L82) · fungsi async

Memulihkan login yang tersimpan saat halaman dibuka.

#### `handleUnauthorizedEvent`

[AuthContext.jsx:123](../frontend/src/context/AuthContext.jsx#L123) · handler

Mengeluarkan pengguna otomatis ketika backend menolak karena login tidak berlaku.

#### `selectActiveAquarium`

[AuthContext.jsx:143](../frontend/src/context/AuthContext.jsx#L143) · fungsi

Mengganti akuarium yang sedang dipakai dan mengingat pilihannya.

#### `useAuth`

[AuthContext.jsx:184](../frontend/src/context/AuthContext.jsx#L184) · hook

Cara bagi halaman dan komponen untuk membaca data login.

### frontend/src/hooks/useBrowserNotifications.js

[frontend/src/hooks/useBrowserNotifications.js](../frontend/src/hooks/useBrowserNotifications.js)

File ini berisi hook yang mengatur notifikasi pop-up browser: mengecek dan meminta izin dari browser, mengingat pilihan pengguna mau menerimanya atau tidak, lalu secara berkala mengecek notifikasi baru ke backend. Pilihan pengguna disimpan di browser dengan nama berbentuk `sa_browser_notifications:USER_ID`, sehingga setiap pengguna punya pilihannya sendiri. Pengecekan dilakukan sekali di awal lalu berulang tiap 15 detik.

Hook ini dipakai di App.jsx, dan tombol untuk menyalakan atau mematikannya ada di halaman Configuration. Agar tidak mengganggu, notifikasi lama yang sudah ada saat pengecekan pertama tidak ditampilkan sebagai pop-up. Hanya notifikasi yang benar-benar baru yang muncul, dan kalau pop-up diklik, halaman `/notifications` dibuka.

#### `getNotificationPermission`

[useBrowserNotifications.js:8](../frontend/src/hooks/useBrowserNotifications.js#L8) · fungsi

Mengecek apakah browser mengizinkan notifikasi pop-up.

#### `storeBrowserNotificationPreference`

[useBrowserNotifications.js:14](../frontend/src/hooks/useBrowserNotifications.js#L14) · fungsi

Menyimpan pilihan pengguna untuk menerima notifikasi browser atau tidak.

#### `useBrowserNotifications`

[useBrowserNotifications.js:23](../frontend/src/hooks/useBrowserNotifications.js#L23) · hook

Mengatur izin dan pengecekan berkala untuk notifikasi pop-up browser.

#### `setBrowserNotificationsEnabled`

[useBrowserNotifications.js:46](../frontend/src/hooks/useBrowserNotifications.js#L46) · fungsi async

Menyalakan atau mematikan notifikasi browser, termasuk meminta izin bila perlu.

#### `checkForNewNotifications`

[useBrowserNotifications.js:74](../frontend/src/hooks/useBrowserNotifications.js#L74) · fungsi async

Mengambil notifikasi terbaru dan menampilkan pop-up untuk yang belum pernah terlihat.

### frontend/src/hooks/useUnreadNotificationCount.js

[frontend/src/hooks/useUnreadNotificationCount.js](../frontend/src/hooks/useUnreadNotificationCount.js)

File ini berisi hook yang menghitung jumlah notifikasi yang belum dibaca untuk akuarium yang sedang dipakai. Angka itu ditampilkan sebagai titik merah pada menu Alerts di AppLayout. Hook ini dipanggil di App.jsx, dan hasilnya diteruskan ke AppLayout.

Jumlah disegarkan saat halaman dibuka, saat ada kabar bahwa notifikasi berubah (`sa:notifications-changed`), saat tab browser kembali terlihat, dan tiap 10 detik selama tab terlihat. Penghitungan dilakukan dari maksimal 500 notifikasi terbaru. Kalau belum ada pengguna atau akuarium, jumlahnya 0.

#### `useUnreadNotificationCount`

[useUnreadNotificationCount.js:8](../frontend/src/hooks/useUnreadNotificationCount.js#L8) · hook

Menghitung jumlah notifikasi yang belum dibaca untuk lencana menu Alerts.

#### `refreshUnreadCount`

[useUnreadNotificationCount.js:21](../frontend/src/hooks/useUnreadNotificationCount.js#L21) · fungsi async

Meminta notifikasi ke backend lalu menghitung berapa yang belum dibaca.

#### `refreshWhenTabVisible`

[useUnreadNotificationCount.js:31](../frontend/src/hooks/useUnreadNotificationCount.js#L31) · fungsi

Menyegarkan jumlah notifikasi belum dibaca hanya saat tab browser terlihat.

### frontend/src/index.css

[frontend/src/index.css](../frontend/src/index.css)

File ini adalah gaya tampilan yang berlaku untuk seluruh aplikasi dan dimuat dari main.jsx. Isinya memuat huruf Inter dari Google Fonts, memuat pustaka gaya Tailwind versi 4, lalu menetapkan Inter sebagai huruf utama (`--font-sans`) dengan huruf bawaan sistem sebagai cadangan.

Sisanya adalah pengaturan tampilan khusus. Scrollbar dibuat tipis (5 piksel) dan berwarna biru samar yang menguat saat disentuh kursor, baik di Firefox maupun Chrome, Edge, dan Safari. Kelas `.scroll-area` dipakai di bagian utama AppLayout untuk area isi yang bisa digulir, sedangkan bagian atas halaman dan menu samping menyembunyikan scrollbar sama sekali supaya tampil bersih.

File ini juga mengatur tampilan dasar penggeser (`input[type="range"]`) yang dipakai `RangeSlider`: garis tipis 4 piksel tanpa bingkai fokus dengan tombol geser bulat biru berukuran 18 piksel, diatur terpisah untuk Chrome dan sejenisnya serta Firefox.

### frontend/src/main.jsx

[frontend/src/main.jsx](../frontend/src/main.jsx)

Ini adalah pintu masuk pertama aplikasi web. File ini mengambil tempat kosong bernama `root` di halaman `index.html`, lalu menggambar seluruh tampilan `App` di dalamnya. Bila tempat itu tidak ditemukan, aplikasi langsung berhenti dengan pesan galat yang jelas.

Seluruh aplikasi dibungkus pelindung galat (`ErrorBoundary`). Jika ada bagian tampilan yang rusak saat berjalan, pengguna melihat pesan kesalahan dan bukan layar kosong. File ini hanya dijalankan oleh peramban dan tidak dipakai oleh file lain.

### frontend/src/pages/Access.jsx

[frontend/src/pages/Access.jsx](../frontend/src/pages/Access.jsx)

Ini adalah halaman `/access`, tempat mengatur siapa yang boleh mengakses akuarium. File ini sangat kecil dan hanya memilih tampilan yang cocok dengan peran pengguna: admin melihat `AdminAccess`, sedangkan pengguna lain yang berhak (owner) melihat `OwnerAccess`.

Halaman ini dibuka lewat `App.jsx` dan hanya bisa dicapai oleh admin atau owner. Viewer dan member biasa tidak bisa masuk. Semua pengambilan dan penyimpanan data dikerjakan komponen di folder `components/access/`, bukan oleh halaman ini sendiri.

#### `AccessPage`

[Access.jsx:7](../frontend/src/pages/Access.jsx#L7) · komponen

Menampilkan judul Access dan memilih tampilan admin atau owner sesuai peran pengguna.

### frontend/src/pages/Configuration.jsx

[frontend/src/pages/Configuration.jsx](../frontend/src/pages/Configuration.jsx)

Berkas ini berisi halaman Configuration, tempat pengguna mengatur profil dan pengaturan akuarium. Halaman punya empat tab. Tab Profile untuk mengganti atau menghapus foto, mengubah nama lengkap, mengganti kata sandi, dan keluar dari akun. Tab System untuk memilih satuan suhu (Celsius atau Fahrenheit), zona waktu, dan jeda kirim data perangkat dari 1 sampai 60 detik. Tab Alerts untuk menentukan batas suhu minimum dan maksimum yang memicu peringatan serta menyalakan atau mematikan notifikasi browser. Tab About menampilkan daftar akuarium milik pengguna beserta perannya, informasi aplikasi, dan teknologi yang dipakai.

Tab Profile bekerja dengan data pengguna dari `AuthContext` dan menyimpan perubahan lewat `updateUserProfile` dan `changePassword` di `backendApi.js`. Foto dikecilkan dulu menjadi bentuk yang bisa disimpan, dan kata sandi baru diperiksa dulu di layar (semua kolom terisi, konfirmasi cocok, minimal 6 karakter). Tab System dan Alerts mengambil data akuarium aktif dari server. Perubahan slider dan pilihan hanya tersimpan di layar sampai pengguna menekan tombol simpan, lalu dikirim ke server lewat `updateSystemConfig` atau `updateTemperatureConfig`. Setiap hasil simpan atau galat ditampilkan sebagai pesan di atas tab.

Pengguna yang tidak boleh mengendalikan akuarium (viewer) melihat banner view-only dan kontrol di tab System dan Alerts dikunci dengan `fieldset` yang dinonaktifkan, sedangkan tab Profile dan About tetap berfungsi normal. Bila belum ada akuarium aktif, tab System dan Alerts menampilkan pesan yang sesuai, dan bila data gagal dimuat tampil pesan galat. Setelah menyimpan, halaman mengirim sinyal ke bagian lain aplikasi agar ikut diperbarui. Notifikasi browser diatur lewat prop `browserNotifications` yang diberikan oleh `App.jsx`, dan halaman ini dipasang di sana sebagai `ConfigurationPage`.

#### `InfoRows`

[Configuration.jsx:119](../frontend/src/pages/Configuration.jsx#L119) · komponen

Menampilkan daftar pasangan label dan nilai sebagai baris dua kolom.

#### `ProfileTab`

[Configuration.jsx:129](../frontend/src/pages/Configuration.jsx#L129) · komponen

Tab profil untuk mengganti foto, nama, kata sandi, dan keluar dari akun.

#### `savePhoto`

[Configuration.jsx:144](../frontend/src/pages/Configuration.jsx#L144) · fungsi async

Menyimpan foto profil baru ke server, atau menghapus foto bila tidak ada file.

#### `handlePhotoSelected`

[Configuration.jsx:162](../frontend/src/pages/Configuration.jsx#L162) · handler

Menangani pemilihan file foto oleh pengguna lalu menyimpannya sebagai foto profil.

#### `handleSaveProfile`

[Configuration.jsx:169](../frontend/src/pages/Configuration.jsx#L169) · handler async

Menyimpan nama lengkap pengguna ke server saat tombol simpan profil ditekan.

#### `handleChangePassword`

[Configuration.jsx:185](../frontend/src/pages/Configuration.jsx#L185) · handler async

Memeriksa isian form lalu mengganti kata sandi pengguna.

#### `setPasswordError`

[Configuration.jsx:186](../frontend/src/pages/Configuration.jsx#L186) · fungsi

Menampilkan pesan galat ganti kata sandi dan menghapus pesan berhasil yang lama.

#### `handleSignOut`

[Configuration.jsx:206](../frontend/src/pages/Configuration.jsx#L206) · handler async

Mengeluarkan akun pengguna lalu membawanya ke halaman login.

#### `SystemTab`

[Configuration.jsx:340](../frontend/src/pages/Configuration.jsx#L340) · komponen

Tab pengaturan sistem untuk satuan suhu, zona waktu, dan jeda kirim data.

#### `getBrowserNotificationHint`

[Configuration.jsx:409](../frontend/src/pages/Configuration.jsx#L409) · fungsi

Menghasilkan kalimat petunjuk tentang status notifikasi browser.

#### `AlertsTab`

[Configuration.jsx:416](../frontend/src/pages/Configuration.jsx#L416) · komponen

Tab peringatan suhu untuk mengatur batas suhu minimum dan maksimum serta notifikasi browser.

#### `AboutTab`

[Configuration.jsx:482](../frontend/src/pages/Configuration.jsx#L482) · komponen

Tab informasi berisi daftar akuarium pengguna beserta perannya, tentang aplikasi, dan teknologi yang dipakai.

#### `ConfigurationPage`

[Configuration.jsx:540](../frontend/src/pages/Configuration.jsx#L540) · komponen

Halaman Configuration dengan empat tab untuk mengatur profil, sistem, peringatan, dan informasi aplikasi.

#### `updateAquariumSection`

[Configuration.jsx:564](../frontend/src/pages/Configuration.jsx#L564) · fungsi

Mengubah satu bagian pengaturan akuarium di layar saja, tanpa menyimpannya ke server.

#### `saveSettings`

[Configuration.jsx:568](../frontend/src/pages/Configuration.jsx#L568) · fungsi async

Pembungkus umum untuk menyimpan pengaturan dan menampilkan pesan berhasil atau galat.

#### `handleSaveSystemSettings`

[Configuration.jsx:583](../frontend/src/pages/Configuration.jsx#L583) · handler

Menyimpan satuan suhu, jeda kirim data, dan zona waktu saat tombol Save System Settings ditekan.

#### `handleSaveTemperatureThresholds`

[Configuration.jsx:596](../frontend/src/pages/Configuration.jsx#L596) · handler

Menyimpan batas suhu minimum dan maksimum ke server dari tab Alerts.

#### `handleToggleBrowserNotifications`

[Configuration.jsx:608](../frontend/src/pages/Configuration.jsx#L608) · handler async

Menyalakan atau mematikan notifikasi browser dan menampilkan hasilnya dengan bahasa yang mudah dipahami.

#### `renderAquariumSettingsTab`

[Configuration.jsx:631](../frontend/src/pages/Configuration.jsx#L631) · fungsi

Menentukan isi tab System dan Alerts sesuai keadaan: belum ada akuarium, memuat, galat, atau data siap.

### frontend/src/pages/Dashboard.jsx

[frontend/src/pages/Dashboard.jsx](../frontend/src/pages/Dashboard.jsx)

Berkas ini berisi halaman Dashboard, yaitu halaman utama untuk memantau dan mengendalikan akuarium yang sedang dipilih. Halaman dibagi menjadi empat tab. Tab Overview menampilkan suhu saat ini, status heater, lampu, dan feeder, grafik suhu dengan angka tertinggi, terendah, dan rata-rata, lima data sensor terbaru, serta lima notifikasi terbaru. Tab Temperature dipakai untuk mengatur suhu target (slider 18 sampai 30 derajat, per 0,5) dan mode heater. Tab Lighting dipakai untuk mengatur jadwal lampu LED, dan tab Feeder dipakai untuk memberi makan ikan dan mengelola jadwal makan. Bagian atas halaman menampilkan judul tab, lencana status perangkat (online, offline, atau belum ada data), dan jam sesuai zona waktu akuarium.

Di tab Temperature, Lighting, dan Feeder, pengguna bisa memilih mode Automatic atau Manual. Pada mode Manual, kotak kontrol manual menyediakan tombol untuk menyalakan atau mematikan perangkat, atau menekan Feed Now untuk memberi makan seketika. Bila mode bukan Manual, tombol dikunci dan muncul peringatan. Bila perintah masih menunggu dijalankan perangkat, atau perangkat sedang offline, pengguna melihat pesan yang menjelaskannya. Perangkat dianggap online jika data terakhirnya masuk dalam batas waktu yang dihitung dari jeda kirim data akuarium (minimal 120 detik).

Data diambil dari server lewat `backendApi.js`: detail akuarium, 12 data sensor terakhir, dan 5 notifikasi terakhir diambil sekaligus saat halaman dibuka. Setelah itu halaman memperbarui diri otomatis setiap 10 detik, hanya selama tab browser sedang terlihat dan setelah data pertama berhasil dimuat. Setiap perubahan (suhu target, mode, jadwal lampu, jadwal makan, atau perintah beri makan) dikirim ke server lewat fungsi pembaruan yang sesuai, lalu tampilan langsung diperbarui dan data dimuat ulang. Selama pemuatan pertama ada animasi memuat, dan bila gagal tampil kotak pesan galat atau tulisan No Data.

Pengguna dengan peran viewer hanya boleh melihat. Mereka mendapat banner view-only, dan seluruh kontrol di tab Temperature, Lighting, dan Feeder dikunci dengan `fieldset` yang dinonaktifkan, sementara tab Overview tetap bisa dibaca. Hak mengendalikan diambil dari `AuthContext`. Alamat halaman menentukan tab aktif (`/dashboard` untuk Overview dan `/dashboard/nama-tab` untuk lainnya), dan halaman ini dipasang oleh `App.jsx` sebagai `DashboardPage`. Halaman memakai `UiKit`, `Icons`, `TemperatureAreaChart`, dan `displayFormatters` untuk tampilan.

#### `toMinutesOfDay`

[Dashboard.jsx:69](../frontend/src/pages/Dashboard.jsx#L69) · fungsi

Mengubah tulisan waktu seperti 08:30 PM menjadi jumlah menit sejak tengah malam agar bisa dihitung.

#### `calculateScheduleDurationHours`

[Dashboard.jsx:76](../frontend/src/pages/Dashboard.jsx#L76) · fungsi

Menghitung berapa jam lampu menyala dalam satu jadwal, termasuk jadwal yang melewati tengah malam.

#### `formatHours`

[Dashboard.jsx:81](../frontend/src/pages/Dashboard.jsx#L81) · fungsi

Mengubah angka jam menjadi teks seperti 8 hrs, atau tanda strip bila datanya tidak valid.

#### `formatModeLabel`

[Dashboard.jsx:83](../frontend/src/pages/Dashboard.jsx#L83) · fungsi

Mengubah kode mode menjadi tulisan yang mudah dibaca, yaitu Manual atau Automatic.

#### `toTimestampMs`

[Dashboard.jsx:85](../frontend/src/pages/Dashboard.jsx#L85) · fungsi

Mengubah tanggal dan jam menjadi satu angka waktu agar bisa dibandingkan.

#### `checkDeviceOnline`

[Dashboard.jsx:88](../frontend/src/pages/Dashboard.jsx#L88) · fungsi

Menentukan apakah perangkat akuarium masih terhubung berdasarkan kapan data terakhirnya masuk.

#### `isFeedPending`

[Dashboard.jsx:95](../frontend/src/pages/Dashboard.jsx#L95) · fungsi

Menentukan apakah perintah beri makan masih menunggu dijalankan oleh perangkat.

#### `TimeSelect`

[Dashboard.jsx:103](../frontend/src/pages/Dashboard.jsx#L103) · komponen

Tiga dropdown untuk memilih satu waktu (jam, menit, dan AM atau PM) di jadwal lampu.

#### `AddFeedingTimeModal`

[Dashboard.jsx:139](../frontend/src/pages/Dashboard.jsx#L139) · komponen

Jendela dari bawah layar untuk memilih waktu dan menambah jadwal makan baru.

#### `handleAddSchedule`

[Dashboard.jsx:148](../frontend/src/pages/Dashboard.jsx#L148) · handler

Menyusun waktu pilihan menjadi jadwal makan baru lalu menutup jendela tambah jadwal.

#### `DeviceOnlineBadge`

[Dashboard.jsx:233](../frontend/src/pages/Dashboard.jsx#L233) · komponen

Lencana kecil yang menunjukkan perangkat sedang online, offline, atau belum mengirim data.

#### `ManualControlPanel`

[Dashboard.jsx:248](../frontend/src/pages/Dashboard.jsx#L248) · komponen

Kotak kontrol manual dengan tombol untuk menyalakan atau mematikan perangkat, atau memberi makan, saat mode Manual.

#### `buttonClass`

[Dashboard.jsx:261](../frontend/src/pages/Dashboard.jsx#L261) · fungsi

Menentukan tampilan tombol di kotak kontrol manual, termasuk saat tombol tidak bisa ditekan.

#### `OverviewTab`

[Dashboard.jsx:308](../frontend/src/pages/Dashboard.jsx#L308) · komponen

Tab ringkasan berisi suhu, status perangkat, grafik suhu, data sensor terbaru, dan notifikasi terbaru.

#### `TemperatureTab`

[Dashboard.jsx:472](../frontend/src/pages/Dashboard.jsx#L472) · komponen

Tab untuk mengatur suhu target, mode heater, dan menyalakan atau mematikan heater secara manual.

#### `saveTemperatureConfig`

[Dashboard.jsx:479](../frontend/src/pages/Dashboard.jsx#L479) · fungsi

Jalan pintas untuk menyimpan pengaturan suhu ke server dan mengabarkan hasilnya.

#### `saveTargetTemp`

[Dashboard.jsx:481](../frontend/src/pages/Dashboard.jsx#L481) · handler async

Menyimpan suhu target yang dipilih pengguna saat tombol Save di tab suhu ditekan.

#### `LightingScheduleCard`

[Dashboard.jsx:573](../frontend/src/pages/Dashboard.jsx#L573) · komponen

Kotak jadwal lampu LED untuk mengatur saklar aktif, waktu mulai, dan waktu selesai.

#### `LightingTab`

[Dashboard.jsx:635](../frontend/src/pages/Dashboard.jsx#L635) · komponen

Tab untuk mengatur lampu: status, jadwal, mode, dan kontrol manual lampu.

#### `saveLightingConfig`

[Dashboard.jsx:639](../frontend/src/pages/Dashboard.jsx#L639) · fungsi

Jalan pintas untuk menyimpan pengaturan lampu ke server.

#### `FeederTab`

[Dashboard.jsx:708](../frontend/src/pages/Dashboard.jsx#L708) · komponen

Tab pemberi makan ikan dengan kontrol Feed Now serta daftar jadwal makan yang bisa ditambah, diaktifkan, atau dihapus.

#### `saveFeedingSchedules`

[Dashboard.jsx:713](../frontend/src/pages/Dashboard.jsx#L713) · fungsi

Menyimpan daftar jadwal makan yang baru ke server.

#### `DashboardPage`

[Dashboard.jsx:808](../frontend/src/pages/Dashboard.jsx#L808) · komponen

Halaman Dashboard yang memuat, memperbarui, dan menampilkan data akuarium aktif dalam empat tab.

#### `refreshDashboardData`

[Dashboard.jsx:833](../frontend/src/pages/Dashboard.jsx#L833) · fungsi async

Mengambil detail akuarium, data sensor terakhir, dan notifikasi terakhir dari server sekaligus.

#### `runDashboardAction`

[Dashboard.jsx:866](../frontend/src/pages/Dashboard.jsx#L866) · fungsi async

Menjalankan satu aksi pengguna dengan urutan sibuk, sukses atau galat, lalu muat ulang data.

#### `saveAquariumSection`

[Dashboard.jsx:883](../frontend/src/pages/Dashboard.jsx#L883) · fungsi

Menyimpan perubahan satu bagian pengaturan akuarium ke server lalu langsung memperbarui tampilan.

#### `handleFeedNow`

[Dashboard.jsx:894](../frontend/src/pages/Dashboard.jsx#L894) · handler

Mengirim perintah beri makan ke akuarium aktif saat tombol Feed Now ditekan.

### frontend/src/pages/DataHistory.jsx

[frontend/src/pages/DataHistory.jsx](../frontend/src/pages/DataHistory.jsx)

Ini adalah halaman `/history` yang menampilkan catatan data akuarium aktif dari waktu ke waktu, yaitu suhu dan status heater, lampu LED, serta pemberi pakan. Catatan bisa dilihat dalam dua tab: tabel dengan pencarian, penyaring jenis kejadian, kartu ringkasan, dan pindah halaman (10 baris per halaman), serta kalender bulanan yang memberi titik biru pada tanggal yang punya data. Di tab tabel ada tombol Export CSV untuk mengunduh riwayat.

Saat halaman dibuka, ia mengambil 500 catatan terbaru dan detail akuarium sekaligus lewat `getTelemetryRecords` dan `getAquariumDetail` dari `backendApi.js`. Zona waktu akuarium (bawaan `Asia/Manila`) ditampilkan di judul sebagai acuan jam. Unduhan CSV memakai `exportTelemetryCsv`. Selama data dimuat tampil animasi memuat, dan bila gagal tampil kotak peringatan.

Halaman ini dibuka lewat `App.jsx` dan tidak boleh dibuka oleh viewer. Tanggal di masa depan di kalender tampil redup dan tidak bisa dipilih. Di layar kecil seperti ponsel, catatan tampil sebagai kartu-kartu dan bukan tabel.

#### `toDateKey`

[DataHistory.jsx:35](../frontend/src/pages/DataHistory.jsx#L35) · fungsi

Mengubah tahun, bulan, dan tanggal menjadi tulisan tanggal yang seragam untuk mengelompokkan catatan per hari.

#### `formatRecordDateTime`

[DataHistory.jsx:38](../frontend/src/pages/DataHistory.jsx#L38) · fungsi

Mengubah waktu sebuah catatan menjadi tulisan tanggal dan jam yang ringkas dan mudah dibaca.

#### `formatRecordTime`

[DataHistory.jsx:42](../frontend/src/pages/DataHistory.jsx#L42) · fungsi

Mengubah waktu sebuah catatan menjadi tulisan jam dan menit dengan format 24 jam.

#### `downloadTelemetryCsv`

[DataHistory.jsx:46](../frontend/src/pages/DataHistory.jsx#L46) · fungsi async

Mengambil riwayat akuarium dalam bentuk file CSV dari server lalu membuat peramban mengunduhnya.

#### `DeviceStatusCells`

[DataHistory.jsx:63](../frontend/src/pages/DataHistory.jsx#L63) · komponen

Tiga sel tabel berisi status heater, lampu LED, dan pemberi pakan dalam bentuk lencana berwarna.

#### `RecordList`

[DataHistory.jsx:72](../frontend/src/pages/DataHistory.jsx#L72) · komponen

Menampilkan daftar catatan sebagai tabel di layar lebar atau kartu di layar kecil, atau tulisan kosong bila tidak ada data.

#### `HistoryTableTab`

[DataHistory.jsx:152](../frontend/src/pages/DataHistory.jsx#L152) · komponen

Tab tabel dengan ringkasan angka, pencarian, penyaring jenis kejadian, pindah halaman, dan tombol Export CSV.

#### `handleExportCsv`

[DataHistory.jsx:188](../frontend/src/pages/DataHistory.jsx#L188) · handler

Menjalankan unduhan CSV saat tombol Export ditekan dan menampilkan pesan galat bila gagal.

#### `HistoryCalendarTab`

[DataHistory.jsx:308](../frontend/src/pages/DataHistory.jsx#L308) · komponen

Tab kalender bulanan yang menampilkan catatan pada tanggal yang dipilih di bawah kalender.

#### `changeMonth`

[DataHistory.jsx:331](../frontend/src/pages/DataHistory.jsx#L331) · handler

Menggeser kalender satu bulan ke belakang atau ke depan saat tombol bulan ditekan.

#### `DataHistoryPage`

[DataHistory.jsx:459](../frontend/src/pages/DataHistory.jsx#L459) · komponen

Halaman riwayat utuh yang memuat data dan menampilkan tab tabel atau kalender.

### frontend/src/pages/Login.jsx

[frontend/src/pages/Login.jsx](../frontend/src/pages/Login.jsx)

Ini adalah halaman `/login` tempat pengguna masuk dengan email dan password. Tampilannya berlatar warna bergradasi, dengan kolom email, kolom password yang punya tombol mata untuk mengintip isinya, tombol masuk, dan tautan ke halaman pendaftaran bagi yang belum punya akun.

Saat tombol masuk ditekan, halaman memastikan kedua kolom terisi lalu mengirimnya ke server lewat `loginWithEmail` dari `backendApi.js`. Bila berhasil, hasil login dicatat lewat `completeSignIn` dari `useAuth` dan pengguna diarahkan ke dashboard. Bila gagal, kotak peringatan merah muncul di atas formulir, dan selama proses berjalan tombol masuk dinonaktifkan agar tidak terkirim dua kali. Halaman ini terbuka untuk siapa saja dan dipasang lewat `App.jsx`.

#### `LoginPage`

[Login.jsx:9](../frontend/src/pages/Login.jsx#L9) · komponen

Halaman masuk dengan kolom email dan password serta tautan ke halaman pendaftaran.

#### `handleLoginSubmit`

[Login.jsx:20](../frontend/src/pages/Login.jsx#L20) · handler

Memeriksa isian lalu mengirim email dan password ke server dan membuka dashboard bila berhasil.

### frontend/src/pages/Notifications.jsx

[frontend/src/pages/Notifications.jsx](../frontend/src/pages/Notifications.jsx)

Ini adalah halaman `/notifications` yang menampilkan daftar pemberitahuan akuarium aktif. Di atas daftar ada tiga kotak penghitung (Alerts merah, Info biru, Success hijau), lalu kartu-kartu notifikasi dengan tombol Read, Delete, dan Mark all read. Jenis notifikasi yang tidak dikenal dianggap informasi.

Saat dibuka, halaman mengambil 500 notifikasi dan detail akuarium lewat `getNotifications` dan `getAquariumDetail`. Menandai dibaca atau menghapus dikirim ke server lewat `markNotificationRead`, `markAllNotificationsRead`, dan `deleteNotification`, lalu daftar di layar langsung ikut berubah tanpa pemuatan ulang. Jumlah yang belum dibaca dilaporkan ke `App.jsx` untuk lencana menu, dan pesan sukses dimunculkan lewat banner. Bila sebuah aksi gagal, pesan galat tampil di atas daftar tanpa menghilangkan notifikasi yang ada.

Halaman ini dibuka lewat `App.jsx` dan tidak boleh dibuka oleh viewer. Waktu notifikasi mengikuti zona waktu akuarium (bawaan `Asia/Manila`).

#### `NotificationsPage`

[Notifications.jsx:29](../frontend/src/pages/Notifications.jsx#L29) · komponen

Halaman notifikasi utuh dengan penghitung tiap jenis serta tombol baca dan hapus.

#### `runNotificationAction`

[Notifications.jsx:63](../frontend/src/pages/Notifications.jsx#L63) · fungsi async

Pembantu bersama yang menjalankan aksi notifikasi ke server lalu memperbarui layar atau menampilkan galat.

#### `handleMarkRead`

[Notifications.jsx:78](../frontend/src/pages/Notifications.jsx#L78) · handler

Menandai satu notifikasi sebagai sudah dibaca saat tombol Read ditekan.

#### `handleMarkAllRead`

[Notifications.jsx:89](../frontend/src/pages/Notifications.jsx#L89) · handler

Menandai semua notifikasi akuarium ini sebagai sudah dibaca saat tombol Mark all read ditekan.

#### `handleDeleteNotification`

[Notifications.jsx:97](../frontend/src/pages/Notifications.jsx#L97) · handler

Menghapus satu notifikasi saat tombol Delete ditekan.

### frontend/src/pages/Register.jsx

[frontend/src/pages/Register.jsx](../frontend/src/pages/Register.jsx)

Ini adalah halaman `/register` untuk membuat akun baru. Formulirnya berisi nama lengkap, email, password, dan ulangi password, ditambah pemilih foto profil yang boleh dikosongkan. Foto yang dipilih langsung tampil sebagai pratinjau di lingkaran avatar, dan bila tidak ada foto, yang tampil adalah huruf awal nama lewat `getInitials` dari `utils/displayFormatters`.

Saat formulir dikirim, halaman memeriksa isian wajib, kecocokan dua password, dan panjang password minimal 6 karakter. Foto lalu diolah menjadi bentuk yang bisa dikirim lewat `createProfilePhotoDataUrl` dari `utils/profilePhoto`, dan data pendaftaran dikirim ke server dengan `registerAccount` dari `backendApi.js`. Bila server meminta konfirmasi email, layar diganti pesan agar pengguna mengecek emailnya beserta tautan ke halaman masuk. Bila tidak, pengguna langsung masuk ke dashboard.

Halaman ini terbuka untuk siapa saja dan dipasang lewat `App.jsx`. Akun yang baru dibuat belum punya akuarium sampai admin atau owner memberinya akses.

#### `RegisterPage`

[Register.jsx:20](../frontend/src/pages/Register.jsx#L20) · komponen

Halaman pendaftaran akun baru dengan foto profil opsional dan layar pesan konfirmasi email.

#### `updateFormField`

[Register.jsx:47](../frontend/src/pages/Register.jsx#L47) · fungsi

Membuat penangan ketikan yang memperbarui satu kolom tertentu pada formulir pendaftaran.

#### `handleAvatarSelected`

[Register.jsx:51](../frontend/src/pages/Register.jsx#L51) · handler

Menyimpan foto yang dipilih pengguna dan menampilkan pratinjaunya di lingkaran avatar.

#### `handleRegisterSubmit`

[Register.jsx:63](../frontend/src/pages/Register.jsx#L63) · handler

Memeriksa isian lalu mengirim data pendaftaran ke server dan mengarahkan pengguna sesuai hasilnya.

### frontend/src/supabaseAuth.js

[frontend/src/supabaseAuth.js](../frontend/src/supabaseAuth.js)

File kecil ini menyiapkan satu sambungan ke layanan login Supabase untuk dipakai di browser. Sambungan dibuat dari alamat proyek dan kunci publik yang diambil dari pengaturan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`. Sesi login disimpan di browser dan token diperbarui otomatis, jadi pengguna tidak perlu login ulang setiap kali halaman dibuka.

Yang dibagikan ke bagian lain hanyalah bagian login (`supabaseAuth`), bukan seluruh sambungan. Dengan begitu tampilan web tidak bisa membaca database Supabase secara langsung, dan semua data harus lewat backend. File ini dipakai oleh backendApi.js dan AuthContext.jsx.

### frontend/src/utils/displayFormatters.js

[frontend/src/utils/displayFormatters.js](../frontend/src/utils/displayFormatters.js)

File ini berisi pembantu untuk menulis data dalam bentuk yang mudah dibaca: suhu dalam satuan Celsius atau Fahrenheit, inisial nama untuk foto profil pengganti, dan waktu relatif seperti `5 mins ago`. Suhu di backend selalu disimpan dalam Celsius, dan fungsi di sini yang mengubahnya sesuai pilihan pengguna.

Kalau suatu nilai kosong atau bukan angka, hasilnya `--` supaya tampilan tetap rapi dan tidak menampilkan angka yang salah. File ini dipakai oleh Dashboard, History, Notifications, Configuration, dan AppLayout.

#### `celsiusToFahrenheit`

[displayFormatters.js:2](../frontend/src/utils/displayFormatters.js#L2) · fungsi

Mengubah suhu dari Celsius ke Fahrenheit.

#### `isNumericValue`

[displayFormatters.js:4](../frontend/src/utils/displayFormatters.js#L4) · fungsi

Memeriksa apakah sebuah nilai benar-benar angka yang sah.

#### `getTemperatureUnitSymbol`

[displayFormatters.js:7](../frontend/src/utils/displayFormatters.js#L7) · fungsi

Memberi simbol satuan suhu sesuai pilihan pengguna.

#### `formatTemperatureValue`

[displayFormatters.js:12](../frontend/src/utils/displayFormatters.js#L12) · fungsi

Mengubah suhu ke satuan pilihan pengguna dan menuliskan angkanya saja.

#### `formatTemperature`

[displayFormatters.js:18](../frontend/src/utils/displayFormatters.js#L18) · fungsi

Menulis suhu lengkap dengan simbol satuan sesuai pilihan pengguna.

#### `getInitials`

[displayFormatters.js:24](../frontend/src/utils/displayFormatters.js#L24) · fungsi

Membuat inisial dari nama untuk foto profil pengganti.

#### `formatRelativeTime`

[displayFormatters.js:36](../frontend/src/utils/displayFormatters.js#L36) · fungsi

Mengubah waktu kejadian menjadi tulisan sederhana seperti 5 mins ago.

### frontend/src/utils/profilePhoto.js

[frontend/src/utils/profilePhoto.js](../frontend/src/utils/profilePhoto.js)

File ini berisi fungsi untuk mengecilkan foto profil yang dipilih pengguna langsung di browser, sebelum dikirim ke backend. Foto asli maksimal 10 MB, lalu diperkecil sampai sisi terpanjangnya 256 piksel dan disimpan sebagai gambar JPEG berkualitas 0,82. Hasil akhirnya dijaga tidak lebih dari 180 KB agar tetap ringan.

Hasilnya berupa teks alamat gambar (data URL) yang bisa langsung disimpan sebagai foto profil tanpa perlu tempat penyimpanan file terpisah. File ini dipakai di halaman Register dan Configuration, dan kalau file tidak valid atau terlalu besar, pengguna mendapat pesan error yang mudah dipahami.

#### `createProfilePhotoDataUrl`

[profilePhoto.js:9](../frontend/src/utils/profilePhoto.js#L9) · fungsi

Memperkecil foto profil pilihan pengguna menjadi gambar JPEG kecil berbentuk teks.

### frontend/vite.config.js

[frontend/vite.config.js](../frontend/vite.config.js)

File ini adalah pengaturan Vite, alat yang menjalankan aplikasi tampilan web saat pengembangan dan membuat versi siap pakainya. Ada dua tambahan (plugin) yang dinyalakan, yaitu `@vitejs/plugin-react` agar kode React bisa dipahami dan `@tailwindcss/vite` agar gaya Tailwind bisa dipakai.

Di dalamnya ada jalan pintas penulisan alamat file: tanda `@` berarti folder `src`, sehingga file bisa dipanggil tanpa menulis alamat yang panjang. Server pengembangan dibuka di alamat `0.0.0.0` supaya bisa diakses dari perangkat lain di jaringan yang sama, dan nomor pintunya diambil dari pengaturan `PORT` dengan nilai cadangan 5173.

## Device

Firmware ESP32: sensor suhu, relay heater dan lampu, jaringan, dan watchdog.

### device/include/README

[device/include/README](../device/include/README)

Berkas bawaan PlatformIO yang menjelaskan fungsi folder header proyek ini. Berkas ini tidak berisi kode dan tidak memengaruhi cara kerja alat.

### device/include/secrets.example.h

[device/include/secrets.example.h](../device/include/secrets.example.h)

Berkas ini adalah contoh file berisi data rahasia alat, yaitu lima isian: nama dan kata sandi Wi-Fi (`WIFI_SSID` dan `WIFI_PASSWORD`, jaringan harus berfrekuensi 2,4 GHz), alamat dasar server backend (`API_BASE_URL`, misalnya `http://192.168.1.10:5000`), nomor identitas akuarium yang dikendalikan alat ini (`AQUARIUM_ID`), dan kunci rahasia alat (`DEVICE_KEY`).

File ini disalin menjadi `device/include/secrets.h`, diisi sesuai keadaan sebenarnya sebelum program dipasang ke alat, lalu dibaca oleh `main.cpp` untuk menyambung ke Wi-Fi dan menyusun alamat ke server. Kunci perangkat berfungsi seperti kata sandi yang membuktikan bahwa permintaan benar-benar datang dari alat ini, jadi file `secrets.h` yang asli sebaiknya tidak dibagikan atau diunggah ke tempat umum.

### device/lib/README

[device/lib/README](../device/lib/README)

Berkas bawaan PlatformIO yang menjelaskan folder library privat proyek. Berkas ini tidak berisi kode dan tidak memengaruhi cara kerja alat.

### device/platformio.ini

[device/platformio.ini](../device/platformio.ini)

Berkas ini berisi pengaturan untuk membangun program ESP32 dengan alat bernama PlatformIO. Isinya satu pengaturan build (`env:esp32dev`): jenis chip `espressif32`, papan `esp32dev`, dan kerangka Arduino, dengan kecepatan monitor log 115200 yang sama dengan `Serial.begin` di `main.cpp`.

Pengaturan ini juga mendaftarkan tiga library tambahan yang dipakai program, yaitu OneWire dan DallasTemperature untuk sensor suhu, serta ArduinoJson versi 7 untuk membaca dan menyusun data JSON. Berkas ini dipakai pengembang saat membangun dan memasang program ke alat.

### device/src/main.cpp

[device/src/main.cpp](../device/src/main.cpp)

Ini adalah program utama alat kecil (ESP32) yang dipasang di akuarium. Alat ini membaca suhu air dari sensor DS18B20 (probe yang dicelupkan ke air), menyalakan dan mematikan heater serta lampu lewat relay (saklar elektronik), membunyikan buzzer bila ada alarm, dan terus bertukar data dengan server backend lewat internet. Perangkat kerasnya memakai pin 4 untuk kabel data sensor suhu, pin 18 untuk relay heater, pin 19 untuk relay lampu, dan pin 5 untuk buzzer. Modul relay yang dipakai bekerja terbalik, jadi relay menyala saat sinyalnya rendah (`LOW`) dan mati saat sinyalnya tinggi (`HIGH`); keadaan mati inilah yang dipakai sebagai kondisi aman saat alat baru menyala atau sebelum alat memulai ulang.

Pekerjaan dibagi ke dua inti prosesor. `setup()` dan `loop()` berjalan di inti 1 dan mengurus semua hal yang menyangkut sensor, relay, dan buzzer, sehingga kontrol heater dan lampu tidak pernah menunggu internet. Komunikasi dengan server dikerjakan di inti 0 oleh dua tugas latar belakang, yaitu `configLongPollTask` dan `telemetryTask`. Data yang dipakai bersama (pengaturan dan status alat) dikunci lewat `runLocked` agar tidak rusak karena diakses dua inti bersamaan. Alamat server, nama Wi-Fi, nomor akuarium, dan kunci perangkat diambil dari `secrets.h`, dan semua permintaan ke server memakai alamat `/api/hardware/:aquariumId/...` dengan kunci perangkat di header `x-device-key`.

Untuk pengaturan, alat memakai teknik long polling. Alat menanyakan pengaturan terbaru ke server dan server menahan jawabannya sampai (paling lama sekitar 20 detik) ada perubahan dari dashboard, sehingga perubahan cepat sampai tanpa alat harus bertanya terus-menerus; bila gagal, alat menunggu 3 detik sebelum mencoba lagi. Pengaturan yang diterima (mode dan suhu target heater, batas suhu alarm, mode dan jadwal lampu, seberapa sering data dikirim, dan zona waktu) disimpan juga ke memori permanen alat (flash). Karena itu, saat alat menyala ulang atau internet belum tersambung, alat tetap bekerja memakai pengaturan terakhir. Bila pengaturan tersimpan rusak atau tidak masuk akal, semua keluaran dibiarkan mati sampai server menjawab. Laporan (telemetri) berisi suhu, status heater dan lampu, alarm, dan waktu pengukuran, dikirim ke server saat status berubah atau saat waktu pengiriman berkala habis (bawaannya tiap 5 detik).

Bila internet putus atau server tidak bisa dijangkau, data yang gagal terkirim tidak hilang. Alat menyimpannya di antrean (backlog) berisi paling banyak 120 catatan. Catatan hanya ditambahkan bila jam internet sudah sinkron dan suhu valid, dan bila kondisinya tidak berubah, jarak antar catatan minimal 60 detik supaya antrean tidak cepat penuh. Jika antrean penuh, catatan paling lama dibuang. Begitu server bisa dijangkau lagi, catatan dikirim bertahap, paling banyak 20 sekaligus. Pengiriman laporan juga ditahan sebentar saat pengaturan baru belum selesai dipakai, agar status yang dilaporkan sudah sesuai pengaturan baru.

Aturan keselamatan ada beberapa lapis. Suhu dibaca tiap 5 detik tanpa membuat program berhenti menunggu (sensor diberi waktu sekitar 0,8 detik untuk mengukur). Bila sensor terlepas, atau memberi angka 85 derajat (angka yang selalu keluar saat sensor baru menyala), atau suhu di luar rentang masuk akal minus 10 sampai 60 derajat, pembacaan dianggap salah dan alarm "Sensor error" menyala sambil heater dimatikan. Heater juga dipaksa mati begitu suhu mencapai batas keselamatan 36 derajat, apa pun mode dan pengaturannya, dengan alarm "Temperature too high". Pada mode otomatis, heater memakai selisih 0,5 derajat di sekitar suhu target agar tidak menyala dan mati terus-menerus. Alarm juga menyala bila suhu melewati batas atas atau bawah dari dashboard.

Ada dua penjaga (watchdog) agar alat tidak macet tanpa diketahui. Penjaga bawaan ESP32 memulai ulang alat bila `loop()` macet, dan penjaga buatan program (`restartIfNetworkTasksStalled`) memulai ulang alat bila salah satu bagian jaringan tidak memberi tanda hidup lebih dari 2 menit, setelah lebih dulu mematikan heater dan lampu. Saat alat menyala lagi, alasan restart yang tidak wajar (watchdog, program error, listrik drop, atau jaringan macet) dicatat dan dilaporkan ke server sebagai laporan restart; alat menunggu jam internet sinkron selama maksimal 60 detik supaya waktu nyalanya (`bootedAt`) bisa ikut dikirim.

Soal waktu, jadwal lampu bergantung pada jam setempat. Alat menyamakan jamnya dengan internet (NTP) memakai `pool.ntp.org` dan `time.google.com`, lalu memasang zona waktu sesuai pilihan dashboard lewat daftar penerjemah nama zona (misalnya Asia/Jakarta menjadi `WIB-7`, lengkap dengan aturan jam musim panas untuk sebagian zona Eropa, Amerika, dan Australia); zona yang tidak ada di daftar hanya dicatat sebagai tidak dikenal. Selama jam belum sinkron, jadwal lampu tidak dihitung dan tidak ada catatan backlog yang dibuat. Pengaturan awal yang serba aman adalah heater dan lampu mati, target 24 derajat, batas alarm 20 sampai 30 derajat, dan zona waktu Asia/Jakarta.

#### `DashboardConfig`

[main.cpp:54](../device/src/main.cpp#L54) · struct

Menyimpan kumpulan pengaturan dari dashboard yang dipakai alat untuk mengatur heater, lampu, alarm, zona waktu, dan frekuensi pengiriman data.

#### `DeviceStatus`

[main.cpp:70](../device/src/main.cpp#L70) · struct

Menyimpan kondisi alat saat ini, yaitu suhu air, status heater dan lampu, serta teks alarm.

#### `BacklogReading`

[main.cpp:78](../device/src/main.cpp#L78) · struct

Menyimpan satu catatan data yang ditampung saat internet putus sampai bisa dikirim ke server.

#### `runLocked`

[main.cpp:105](../device/src/main.cpp#L105) · fungsi

Menjalankan satu tugas singkat sambil mengunci data bersama agar tidak diganggu inti prosesor lain.

#### `getConfigSnapshot`

[main.cpp:112](../device/src/main.cpp#L112) · fungsi

Mengambil salinan pengaturan yang sedang dipakai dengan aman agar bisa dibaca tanpa berubah di tengah jalan.

#### `getStatusSnapshot`

[main.cpp:119](../device/src/main.cpp#L119) · fungsi

Mengambil salinan kondisi alat saat ini dengan aman agar bisa dibaca tanpa berubah di tengah jalan.

#### `storeConfigAndSaveToFlash`

[main.cpp:126](../device/src/main.cpp#L126) · fungsi

Memasang pengaturan baru dari server dan menyimpannya ke memori permanen alat bila ada yang berubah.

#### `loadConfigFromFlash`

[main.cpp:139](../device/src/main.cpp#L139) · fungsi

Membaca pengaturan terakhir dari memori permanen saat alat menyala agar tetap bekerja walau internet belum tersambung.

#### `initRelayPin`

[main.cpp:158](../device/src/main.cpp#L158) · fungsi

Menyiapkan pin relay dengan aman agar heater atau lampu tidak sempat menyala sekilas saat alat baru menyala.

#### `setAlarmEvent`

[main.cpp:167](../device/src/main.cpp#L167) · fungsi

Menetapkan pesan alarm yang sedang aktif, atau mengosongkannya bila kondisi sudah normal.

#### `updateBuzzer`

[main.cpp:175](../device/src/main.cpp#L175) · fungsi

Membunyikan buzzer putus-putus selama alarm aktif dan mendiamkannya saat kondisi normal.

#### `applyTimezone`

[main.cpp:214](../device/src/main.cpp#L214) · fungsi

Memasang zona waktu alat dan mengatur sinkronisasi jam internet sesuai zona yang dipilih di dashboard.

#### `getLocalMinuteOfDay`

[main.cpp:228](../device/src/main.cpp#L228) · fungsi

Menghitung sekarang sudah menit keberapa sejak tengah malam menurut jam setempat.

#### `getEpochSeconds`

[main.cpp:239](../device/src/main.cpp#L239) · fungsi

Memberi waktu sekarang dalam detik sejak tahun 1970, atau nol bila jam belum benar.

#### `setHeaterRelay`

[main.cpp:256](../device/src/main.cpp#L256) · fungsi

Menyalakan atau mematikan heater lewat relay dan mencatat perubahannya.

#### `applyHeaterControl`

[main.cpp:265](../device/src/main.cpp#L265) · fungsi

Mengatur kapan heater menyala atau mati agar suhu air tetap aman, sekaligus menyalakan alarm bila perlu.

#### `updateTempSensorAndHeater`

[main.cpp:288](../device/src/main.cpp#L288) · fungsi

Membaca suhu dari sensor secara berkala tanpa membuat program berhenti menunggu, lalu meminta heater disesuaikan.

#### `setLampRelay`

[main.cpp:319](../device/src/main.cpp#L319) · fungsi

Menyalakan atau mematikan lampu akuarium lewat relay dan mencatat perubahannya.

#### `isMinuteInSchedule`

[main.cpp:328](../device/src/main.cpp#L328) · fungsi

Memeriksa apakah waktu sekarang termasuk dalam jadwal lampu, termasuk jadwal yang melewati tengah malam.

#### `applyLampControl`

[main.cpp:335](../device/src/main.cpp#L335) · fungsi

Menentukan lampu harus menyala atau mati berdasarkan mode, jadwal, dan jam setempat.

#### `buildApiUrl`

[main.cpp:345](../device/src/main.cpp#L345) · fungsi

Menyusun alamat lengkap server untuk akuarium ini sesuai bagian yang dituju.

#### `sendHttpRequest`

[main.cpp:350](../device/src/main.cpp#L350) · fungsi

Mengirim permintaan ke server dengan kunci perangkat sebagai tanda pengenal dan mengembalikan kode jawabannya.

#### `parseClockTimeToMinutes`

[main.cpp:365](../device/src/main.cpp#L365) · fungsi

Mengubah jam berformat 12 jam dari dashboard menjadi hitungan menit sejak tengah malam.

#### `fetchConfigFromBackend`

[main.cpp:379](../device/src/main.cpp#L379) · fungsi

Mengambil pengaturan terbaru dari server dengan long polling lalu memasangnya di alat.

#### `sendTelemetry`

[main.cpp:434](../device/src/main.cpp#L434) · fungsi

Mengirim laporan kondisi alat, seperti suhu, status heater dan lampu, serta alarm, ke server.

#### `isTemperatureValid`

[main.cpp:477](../device/src/main.cpp#L477) · fungsi

Memeriksa apakah suhu yang terbaca masuk akal dan bukan salah baca sensor.

#### `enqueueBacklogReading`

[main.cpp:482](../device/src/main.cpp#L482) · fungsi

Menambahkan satu catatan ke antrean saat data belum bisa terkirim ke server.

#### `sendBacklogBatch`

[main.cpp:506](../device/src/main.cpp#L506) · fungsi

Mengirim sekelompok catatan tertunda dari antrean ke server saat internet sudah kembali.

#### `configLongPollTask`

[main.cpp:540](../device/src/main.cpp#L540) · task

Pekerjaan latar belakang yang terus menanyakan pengaturan terbaru ke server selama Wi-Fi tersambung.

#### `telemetryTask`

[main.cpp:559](../device/src/main.cpp#L559) · task

Pekerjaan latar belakang yang mengirim laporan kondisi alat ke server dan mengurus antrean data tertunda.

#### `getResetReasonText`

[main.cpp:607](../device/src/main.cpp#L607) · fungsi

Mengubah kode alasan alat menyala ulang menjadi kalimat yang mudah dibaca untuk catatan log.

#### `getAbnormalBootReason`

[main.cpp:621](../device/src/main.cpp#L621) · fungsi

Memberi alasan restart hanya bila alat menyala ulang secara tidak wajar, misalnya karena macet atau listrik drop.

#### `restartIfNetworkTasksStalled`

[main.cpp:634](../device/src/main.cpp#L634) · fungsi

Penjaga buatan program yang memulai ulang alat dengan aman bila bagian jaringan macet.

#### `setup`

[main.cpp:649](../device/src/main.cpp#L649) · fungsi

Menyiapkan alat sekali saat menyala, mulai dari keluaran aman, sensor, pengaturan tersimpan, Wi-Fi, sampai tugas jaringan dan watchdog.

#### `loop`

[main.cpp:686](../device/src/main.cpp#L686) · fungsi

Putaran kerja utama yang berulang terus untuk membaca suhu, mengatur heater dan lampu, serta membunyikan buzzer.

### device/test/README

[device/test/README](../device/test/README)

Berkas bawaan PlatformIO yang menjelaskan folder pengujian unit. Berkas ini tidak berisi kode dan tidak memengaruhi cara kerja alat.

## Database

Skema, koneksi, dan semua query. Query dijelaskan paling rinci, lengkap dengan SQL-nya, dan setiap query punya link ke penjelasan kodenya di bagian Backend.

### Ringkasan Database

Seluruh data aplikasi disimpan di Supabase PostgreSQL, yaitu database online yang dikelola oleh layanan Supabase. Isinya meliputi akun pengguna, daftar akuarium beserta pengaturannya, keadaan terkini dan riwayat data dari alat, serta notifikasi. Bagian ini mengumpulkan semua perintah database dan kode yang bergantung padanya, lengkap dengan tautan ke penjelasan kodenya.

Hanya server backend (Express) yang boleh membuka database ini, dan itu dilakukan lewat koneksi langsung memakai library `pg`. Browser tidak punya jalur apa pun ke data, dan alat ESP32 pun tidak memegang kredensial database; alat hanya berbicara lewat alamat `/api/hardware/...` milik backend dengan kunci alatnya. Dengan begitu, setiap data yang keluar masuk selalu melewati kode backend yang bisa memeriksa siapa yang meminta dan apa haknya.

Data diatur dalam sembilan tabel. Tabel `profiles`, `aquariums`, dan `aquarium_members` menyimpan siapa pengguna, akuarium apa saja yang ada, dan siapa yang mengurus akuarium mana. Tabel `devices`, `device_state`, `telemetry_history`, dan `lighting_usage` menyimpan hal yang berkaitan dengan alat: alat yang terdaftar, keadaan terkininya, riwayat data, dan lama lampu menyala. Tabel `notifications` dan `notification_states` menyimpan pesan pemberitahuan dan status baca atau hapus tiap orang. Login sendiri dikelola Supabase Auth di bagian `auth`, sedangkan data aplikasi ada di bagian `public`.

Soal siapa boleh membaca dan menulis apa, ada dua lapis. Lapis pertama adalah penguncian di database: semua tabel dikunci dengan row level security (RLS) tanpa satu pun aturan izin, dan hak role `anon` serta `authenticated` (role yang dipakai klien Supabase dari browser) dicabut. Artinya, siapa pun yang mencoba membuka tabel lewat jalur Supabase langsung akan ditolak. Backend tidak terkena kunci ini karena memakai role pemilik tabel (`postgres`).

Lapis kedua adalah pembagian hak di kode backend. Ada peran umum pada akun (admin atau user biasa) dan peran pada tiap akuarium (owner, member, atau viewer). Admin boleh mengelola semuanya, owner dan member mengurus akuarium miliknya, sedangkan viewer hanya boleh memantau. Pemeriksaan ini dikerjakan oleh `findAccessibleAquarium` berdasarkan `profiles.role` dan `aquarium_members.role`, dan diuji otomatis oleh `lockdown.test.js`.

Cara semua bagian ini bersambung kira-kira begini. Browser masuk lewat Supabase Auth dan memperoleh token, lalu mengirim token itu ke backend. Backend memeriksa token, mencari peran pengguna di database, dan baru menjalankan perintah SQL yang sesuai. Alat ESP32 mengirim data ke backend, yang lalu menyimpannya ke tabel keadaan, riwayat, pemakaian lampu, dan notifikasi. Skema database dibuat lewat berkas migrasi SQL yang dijalankan dengan Supabase CLI.

* Mesin: Supabase PostgreSQL (versi 17 untuk database lokal, lihat `project_id` pada `config.toml`). Login dikelola Supabase Auth (bagian `auth`), sedangkan data aplikasi ada di bagian `public`.
* Koneksi: `databasePool` membuka kumpulan koneksi dari alamat `DATABASE_URL` (tombol Connect, Session pooler, port 5432). Jumlah koneksi diatur `DB_POOL_MAX` (bawaan 5), koneksi menganggur ditutup setelah 30 detik, dan SSL aktif kecuali `DATABASE_SSL` bernilai `false` (untuk database lokal). Angka desimal dari database diubah jadi angka biasa oleh [pg.types.setTypeParser](#pgtypessettypeparser). Semua perintah lewat [queryDatabase](#querydatabase) atau [runInTransaction](#runintransaction).
* Keamanan data: kesembilan tabel dikunci dengan row level security tanpa aturan izin satu pun, dan hak role `anon` serta `authenticated` dicabut, termasuk untuk objek baru. Data API Supabase juga dimatikan di config.toml (`[api] enabled = false`). Backend memakai role pemilik tabel (`postgres`) sehingga tidak terkena kunci itu. Pembagian hak (admin, owner, member, viewer) dikerjakan di kode backend lewat [findAccessibleAquarium](#findaccessibleaquarium), berdasarkan `profiles.role` dan `aquarium_members.role`. Pengujiannya ada di [supabaseLikeDatabase](#supabaselikedatabase) (memakai PGlite dan ketiga migrasi).
* Migrasi: tiga berkas SQL di `backend/supabase/migrations/` (skema awal, kolom `monitoring_public`, satu alat per akuarium) dijalankan lewat Supabase CLI.
* Tabel:
    * [profiles](#profiles): satu baris per akun login (nama, email, foto, peran umum admin atau user).
    * [aquariums](#aquariums): daftar akuarium beserta pengaturannya (suhu, lampu, pakan, sistem) dan penanda `monitoring_public`.
    * [aquarium_members](#aquarium_members): peran owner atau member tiap orang pada tiap akuarium.
    * [devices](#devices): alat ESP32 (hanya sidik SHA-256 dari kuncinya), maksimal satu per akuarium.
    * [device_state](#device_state): keadaan terkini dari kiriman alat (suhu, heater, lampu, pakan, penanda notifikasi).
    * [telemetry_history](#telemetry_history): riwayat data alat, disimpan berkala atau saat ada perubahan.
    * [lighting_usage](#lighting_usage): detik lampu menyala dan mati per hari (7 hari terakhir yang dipakai).
    * [notifications](#notifications): pesan pemberitahuan per akuarium atau per orang.
    * [notification_states](#notification_states): status sudah dibaca atau dihapus tiap orang atas tiap notifikasi.
* Modul yang menyentuh database:
    * [backend/config/database.js](../backend/config/database.js): kumpulan koneksi, `queryDatabase`, dan `runInTransaction`.
    * [backend/config/aquarium-repository.js](../backend/config/aquarium-repository.js): perintah bersama untuk membaca akuarium dan memeriksa hak akses.
    * [backend/index.js](../backend/index.js): mengecek koneksi saat server mulai.
    * [backend/middleware/auth.js](../backend/middleware/auth.js): membaca peran umum dan mengenali kunci alat.
    * [backend/routes/auth.js](../backend/routes/auth.js): menyamakan profil setelah login Supabase.
    * [backend/routes/users.js](../backend/routes/users.js): membaca dan mengubah profil.
    * [backend/routes/admin.js](../backend/routes/admin.js): mengelola pengguna, akuarium, dan alat.
    * [backend/routes/aquariums.js](../backend/routes/aquariums.js): pengaturan, riwayat, notifikasi, dan anggota akuarium.
    * [backend/routes/hardware.js](../backend/routes/hardware.js): data dan pengaturan yang dikirim atau diminta alat.
    * [backend/utils/device-watchdog.js](../backend/utils/device-watchdog.js): mendeteksi alat yang offline.
    * [backend/utils/notification-records.js](../backend/utils/notification-records.js): menyimpan notifikasi dan potongan SQL penyaring notifikasi.
    * [backend/tests/lockdown.test.js](../backend/tests/lockdown.test.js): menguji bahwa akses database terkunci bagi role Supabase.
    * [frontend/src/supabaseAuth.js](../frontend/src/supabaseAuth.js): klien Supabase Auth saja, tanpa akses tabel (lihat bagian Supabase Auth dan Frontend).

### Peta Tabel

Bagian ini adalah peta dari kesembilan tabel database. Untuk tiap tabel, tersedia ringkasan isinya, daftar kode yang membaca tabel itu, dan daftar kode yang menulis ke tabel itu. Dengan peta ini, orang yang ingin mengubah satu tabel bisa langsung tahu bagian program mana saja yang ikut terpengaruh.

Cara membacanya: tiap entri diawali judul tabel dan tautan ke tempat tabel itu dibuat di berkas migrasi SQL. Di bawahnya ada satu kalimat tentang jenis data yang disimpan dan alasannya. Lalu ada dua daftar, yaitu "Dibaca oleh" (rute atau fungsi yang mengambil data dari tabel) dan "Ditulis oleh" (rute, fungsi, atau trigger yang menambah, mengubah, atau menghapus baris). Keterangan di dalam kurung pada tiap butir menunjukkan jenis perintah SQL atau kolom yang disentuh.

Setelah kesembilan tabel, ada entri untuk dua fungsi SQL dan dua trigger yang membuat baris profil dan baris keadaan alat secara otomatis, lalu satu entri keamanan yang mengunci tabel dari akses luar. Semua yang ada di sini dibuat di berkas migrasi awal. Dua migrasi berikutnya menambah kolom `monitoring_public` pada tabel `aquariums` (menentukan apakah orang yang bukan anggota boleh memantau, bawaannya nyala) dan membuat tabel `devices` hanya boleh punya satu alat per akuarium.

#### Tabel `profiles`

[init.sql:19](../backend/supabase/migrations/20261028000000_init.sql#L19) · tabel

Menyimpan data diri tiap akun (nama, email, foto, dan peran umum) supaya aplikasi tahu siapa penggunanya dan apa haknya.

Dibaca oleh:

* [loadGlobalRole](#loadglobalrole) (peran global)
* [POST /api/auth/session](#post-apiauthsession) (UPDATE ... RETURNING)
* [GET /api/users/:userId](#get-apiusersuserid)
* [PUT /api/users/:userId](#put-apiusersuserid) (SELECT FOR UPDATE)
* [GET /api/admin/users](#get-apiadminusers)
* [POST /api/admin/aquariums](#post-apiadminaquariums) (cari owner)
* [GET /api/admin/aquariums](#get-apiadminaquariums) (daftar owner)
* [loadActorName](#loadactorname)
* [GET /api/aquariums/:aquariumId/members](#get-apiaquariumsaquariumidmembers)
* [GET /api/aquariums/:aquariumId/candidates](#get-apiaquariumsaquariumidcandidates)
* [PUT /api/aquariums/:aquariumId/members](#put-apiaquariumsaquariumidmembers) (cari user target)

Ditulis oleh:

* trigger [handle_new_user](#handle_new_user) (INSERT dari `auth.users`)
* [POST /api/auth/session](#post-apiauthsession) (INSERT on conflict do nothing, lalu UPDATE foto dan peran admin awal)
* [PUT /api/users/:userId](#put-apiusersuserid) (UPDATE nama atau foto)
* [PATCH /api/admin/users/:userId](#patch-apiadminusersuserid) (UPDATE role)

#### Tabel `aquariums`

[init.sql:53](../backend/supabase/migrations/20261028000000_init.sql#L53) · tabel

Menyimpan daftar akuarium beserta nama dan pengaturannya (suhu, lampu, pakan, sistem) agar tiap akuarium bisa diatur sendiri-sendiri.

Dibaca oleh:

* [getAquariumById](#getaquariumbyid) dan [findAccessibleAquarium](#findaccessibleaquarium) (join `device_state`; yang kedua memakai FOR UPDATE OF a bila `lock`)
* [GET /api/aquariums](#get-apiaquariums)
* [GET /api/admin/aquariums](#get-apiadminaquariums)
* [aquariumExistsById](#aquariumexistsbyid)
* [loadInitialTelemetryState](#loadinitialtelemetrystate) dan [notifyDeviceOffline](#notifydeviceoffline) (ambil `system_config`)
* [POST /api/hardware/:aquariumId/telemetry](#post-apihardwareaquariumidtelemetry) (ambil `temp_config` dan `system_config`)

Ditulis oleh:

* [POST /api/admin/aquariums](#post-apiadminaquariums) (INSERT dengan config bawaan)
* [PATCH /api/admin/aquariums/:aquariumId](#patch-apiadminaquariumsaquariumid) (UPDATE `name`, `monitoring_public`)
* [createConfigPatchHandler](#createconfigpatchhandler) (UPDATE jsonb dengan operator `||`)
* [POST /api/aquariums/:aquariumId/feeder/trigger](#post-apiaquariumsaquariumidfeedertrigger) (UPDATE `feeder_last_triggered_at`)

#### Tabel `aquarium_members`

[init.sql:68](../backend/supabase/migrations/20261028000000_init.sql#L68) · tabel

Mencatat siapa saja yang ikut mengurus tiap akuarium dan sebagai owner atau member, sehingga hak akses per akuarium bisa diperiksa.

Dibaca oleh:

* [findAccessibleAquarium](#findaccessibleaquarium) (left join peran user, dan `not exists` untuk akses viewer)
* [GET /api/aquariums](#get-apiaquariums)
* [GET /api/admin/users](#get-apiadminusers)
* [GET /api/admin/aquariums](#get-apiadminaquariums) (hitung member dan daftar owner)
* [GET /api/aquariums/:aquariumId/members](#get-apiaquariumsaquariumidmembers)
* [GET /api/aquariums/:aquariumId/candidates](#get-apiaquariumsaquariumidcandidates)
* [PUT /api/aquariums/:aquariumId/members](#put-apiaquariumsaquariumidmembers) (cek peran lama)
* [DELETE /api/aquariums/:aquariumId/members/:userId](#delete-apiaquariumsaquariumidmembersuserid)

Ditulis oleh:

* [POST /api/admin/aquariums](#post-apiadminaquariums) (INSERT owner awal)
* [PUT /api/aquariums/:aquariumId/members](#put-apiaquariumsaquariumidmembers) (INSERT on conflict do update role)
* [DELETE /api/aquariums/:aquariumId/members/:userId](#delete-apiaquariumsaquariumidmembersuserid) (DELETE)

#### Tabel `devices`

[init.sql:78](../backend/supabase/migrations/20261028000000_init.sql#L78) · tabel

Menyimpan alat ESP32 yang terdaftar pada tiap akuarium, hanya dalam bentuk sidik digital kuncinya agar kunci asli tidak bisa dibaca dari database.

Dibaca oleh:

* [requireDeviceKey](#requiredevicekey) (cari perangkat dari hash kunci)
* [GET /api/admin/aquariums/:aquariumId/devices](#get-apiadminaquariumsaquariumiddevices)
* [POST /api/admin/aquariums/:aquariumId/devices](#post-apiadminaquariumsaquariumiddevices) (cek perangkat yang sudah ada)
* [GET /api/admin/aquariums](#get-apiadminaquariums) (hitung `deviceCount`)

Ditulis oleh:

* [POST /api/admin/aquariums/:aquariumId/devices](#post-apiadminaquariumsaquariumiddevices) (INSERT)
* [DELETE /api/admin/devices/:deviceId](#delete-apiadmindevicesdeviceid) (DELETE)

#### Tabel `device_state`

[init.sql:91](../backend/supabase/migrations/20261028000000_init.sql#L91) · tabel

Menyimpan keadaan terkini tiap akuarium dari kiriman alat (suhu, heater, lampu, pakan), dipisah dari tabel akuarium supaya pembaruan tiap beberapa detik tidak mengganggu data pengaturan.

Dibaca oleh:

* [getAquariumById](#getaquariumbyid) dan [findAccessibleAquarium](#findaccessibleaquarium) (left join untuk `realtimeState`)
* [POST /api/hardware/:aquariumId/telemetry](#post-apihardwareaquariumidtelemetry) (SELECT FOR UPDATE OF ds)
* [loadInitialTelemetryState](#loadinitialtelemetrystate)
* [notifyDeviceOffline](#notifydeviceoffline) (SELECT FOR UPDATE OF ds)

Ditulis oleh:

* [POST /api/hardware/:aquariumId/telemetry](#post-apihardwareaquariumidtelemetry) (UPDATE suhu, status, `last_updated`, penanda notifikasi, `last_history_at`)
* [notifyDeviceOffline](#notifydeviceoffline) (UPDATE `offline_notified = true`)
* trigger [create_device_state](#create_device_state) (INSERT baris awal)

#### Tabel `telemetry_history`

[init.sql:119](../backend/supabase/migrations/20261028000000_init.sql#L119) · tabel

Menyimpan riwayat suhu dan status heater, lampu, serta pakan dari alat pada waktu tertentu, untuk ditampilkan sebagai daftar riwayat dan diekspor ke CSV.

Dibaca oleh:

* [queryTelemetryRecords](#querytelemetryrecords) (dipakai [GET /api/aquariums/:aquariumId/telemetry](#get-apiaquariumsaquariumidtelemetry) dan [GET /api/aquariums/:aquariumId/telemetry/export](#get-apiaquariumsaquariumidtelemetryexport))

Ditulis oleh:

* [POST /api/hardware/:aquariumId/telemetry](#post-apihardwareaquariumidtelemetry) (INSERT on conflict do nothing)
* [POST /api/hardware/:aquariumId/telemetry/backlog](#post-apihardwareaquariumidtelemetrybacklog) (INSERT massal dengan `unnest`)

#### Tabel `lighting_usage`

[init.sql:133](../backend/supabase/migrations/20261028000000_init.sql#L133) · tabel

Mencatat berapa detik lampu menyala dan mati pada tiap hari per akuarium, untuk menghitung rata-rata jam lampu menyala dalam 7 hari terakhir.

Dibaca oleh:

* [getLightingAverageHours](#getlightingaveragehours) (jumlah 7 hari terakhir, dipanggil [buildAquariumResponse](#buildaquariumresponse))

Ditulis oleh:

* [POST /api/hardware/:aquariumId/telemetry](#post-apihardwareaquariumidtelemetry) (upsert penambahan detik, lalu DELETE baris lebih tua dari 7 hari)

#### Tabel `notifications`

[init.sql:145](../backend/supabase/migrations/20261028000000_init.sql#L145) · tabel

Menyimpan pesan pemberitahuan untuk satu akuarium atau satu orang (judul, isi, jenis, dan pelakunya) agar pengguna tahu kejadian penting.

Dibaca lewat potongan SQL `NOTIFICATION_STATE_JOIN` dan `VISIBLE_NOTIFICATION_CONDITION` oleh:

* [GET /api/aquariums/:aquariumId/notifications](#get-apiaquariumsaquariumidnotifications)
* [PATCH /api/aquariums/:aquariumId/notifications/read-all](#patch-apiaquariumsaquariumidnotificationsread-all)
* [isNotificationVisibleToUser](#isnotificationvisibletouser)

Ditulis lewat [addAquariumNotification](#addaquariumnotification) atau [addUserNotification](#addusernotification) oleh:

* [createConfigPatchHandler](#createconfigpatchhandler)
* [POST /api/aquariums/:aquariumId/feeder/trigger](#post-apiaquariumsaquariumidfeedertrigger)
* [POST /api/hardware/:aquariumId/telemetry](#post-apihardwareaquariumidtelemetry)
* [notifyDeviceOffline](#notifydeviceoffline)
* [POST /api/auth/password-changed](#post-apiauthpassword-changed)
* [PUT /api/users/:userId](#put-apiusersuserid)

#### Tabel `notification_states`

[init.sql:167](../backend/supabase/migrations/20261028000000_init.sql#L167) · tabel

Mencatat kapan tiap orang membaca atau menghapus tiap notifikasi, supaya status baca dan hapus berbeda untuk setiap pengguna.

Dibaca (digabung lewat `NOTIFICATION_STATE_JOIN`) oleh:

* [GET /api/aquariums/:aquariumId/notifications](#get-apiaquariumsaquariumidnotifications)
* [PATCH /api/aquariums/:aquariumId/notifications/read-all](#patch-apiaquariumsaquariumidnotificationsread-all)
* [isNotificationVisibleToUser](#isnotificationvisibletouser)

Ditulis (dibuat baru atau diperbarui bila sudah ada) oleh:

* [PATCH /api/aquariums/:aquariumId/notifications/read-all](#patch-apiaquariumsaquariumidnotificationsread-all) (`read_at`)
* [PATCH /api/aquariums/:aquariumId/notifications/:notificationId/read](#patch-apiaquariumsaquariumidnotificationsnotificationidread) (`read_at`)
* [DELETE /api/aquariums/:aquariumId/notifications/:notificationId](#delete-apiaquariumsaquariumidnotificationsnotificationid) (`dismissed_at`)

#### Fungsi SQL `handle_new_user`

[init.sql:29](../backend/supabase/migrations/20261028000000_init.sql#L29) · fungsi

Menyalin akun baru dari daftar akun Supabase Auth ke tabel profil.

#### Trigger `on_auth_user_created`

[init.sql:46](../backend/supabase/migrations/20261028000000_init.sql#L46) · trigger

Menjalankan `handle_new_user` otomatis setiap kali ada akun baru di Supabase Auth.

#### Fungsi SQL `create_device_state`

[init.sql:104](../backend/supabase/migrations/20261028000000_init.sql#L104) · fungsi

Menambahkan baris keadaan alat dengan nilai awal bawaan untuk akuarium yang baru dibuat.

#### Trigger `on_aquarium_created`

[init.sql:113](../backend/supabase/migrations/20261028000000_init.sql#L113) · trigger

Menjalankan `create_device_state` otomatis setiap kali akuarium baru dibuat.

#### Keamanan `enable row level security`

[init.sql:178](../backend/supabase/migrations/20261028000000_init.sql#L178) · policy

Mengunci kesembilan tabel dari akses luar dengan row level security tanpa aturan izin dan mencabut hak role `anon` dan `authenticated`.

### Query backend/config/aquarium-repository.js

[backend/config/aquarium-repository.js](../backend/config/aquarium-repository.js)

File ini berisi perintah-perintah database seputar satu akuarium: mengambil datanya bersama keadaan terkininya dari tabel `aquariums` dan `device_state`, memeriksa apakah seorang pengguna boleh mengaksesnya lewat tabel `aquarium_members`, dan menghitung rata-rata jam lampu dari tabel `lighting_usage`. Semuanya membaca saja, tidak ada yang mengubah data.

Daftar kolom yang dipilih ditulis sekali sebagai potongan teks `AQUARIUM_SELECT_COLUMNS`, lalu disisipkan ke dua perintah pengambilan akuarium. Perintah `findAccessibleAquarium` punya opsi `lock` yang menambahkan `for update of a`: baris akuarium dikunci sampai transaksi selesai, jadi dua perubahan pengaturan atau pemberian pakan yang datang bersamaan tidak saling menimpa. Permintaan kedua menunggu sampai yang pertama selesai.

Perintah-perintah di sini boleh dijalankan lewat koneksi biasa atau koneksi transaksi yang dikirim pemanggil. Peran akhir pengguna (admin, anggota, atau penonton) tidak ditentukan oleh database sendiri tetapi dihitung di kode dari hasil bacaan.

#### Query `AQUARIUM_SELECT_COLUMNS`

[aquarium-repository.js:6](../backend/config/aquarium-repository.js#L6) · query

**Tujuan.** Potongan teks yang dipakai ulang (bukan perintah lengkap) untuk memilih semua data sebuah akuarium sekaligus keadaan terkininya. Ia disisipkan ke perintah `getAquariumById` dan `findAccessibleAquarium` supaya daftar kolomnya selalu sama.

**Cara kerja.**

* `a.*` mengambil semua kolom dari [aquariums](#aquariums) (nama, pengaturan, pengaturan lampu, dan seterusnya).
* Kolom `ds.` mengambil keadaan terkini dari [device_state](#device_state): suhu, status heater, lampu, pakan, dan waktu kabar terakhir.
* Penanda `offline_notified`, `sensor_error_notified`, dan `last_history_at` ikut diambil. Ini menandai apakah notifikasi alat offline atau sensor error sudah dikirim, dan kapan riwayat suhu terakhir dicatat.
* Alias `a` dan `ds` didefinisikan oleh perintah yang menyisipkan potongan ini.

**Hasil.** Tidak ada hasil sendiri karena ini hanya potongan teks. Hasilnya adalah baris akuarium lengkap dengan keadaan terkininya setelah disisipkan ke perintah lain.

**SQL.**

```sql
a.*,
ds.current_temp, ds.heater_status, ds.led_status, ds.feeder_status, ds.last_updated,
ds.offline_notified, ds.sensor_error_notified, ds.last_history_at
```

Penjelasan kode: `AQUARIUM_SELECT_COLUMNS`.

#### Query `getAquariumById`

[aquarium-repository.js:14](../backend/config/aquarium-repository.js#L14) · query

**Tujuan.** Mengambil data satu akuarium berdasarkan id-nya beserta keadaan terkininya, tanpa memeriksa siapa yang meminta. Dipakai oleh jalur alat yang kuncinya sudah diperiksa: [POST /api/hardware/:aquariumId/telemetry/backlog](#post-apihardwareaquariumidtelemetrybacklog) dan [GET /api/hardware/:aquariumId/config](#get-apihardwareaquariumidconfig).

**Cara kerja.**

* Id diperiksa dulu di kode; bila bentuknya tidak valid, database tidak ditanya sama sekali dan hasilnya kosong.
* Baris dibaca dari [aquariums](#aquariums), lalu digabung dengan [device_state](#device_state) lewat `left join`, sehingga akuarium tetap muncul walau belum punya keadaan terkini.
* Filternya hanya `a.id = $1`, jadi paling banyak satu baris yang kembali.
* Kolom yang dipilih berasal dari potongan `AQUARIUM_SELECT_COLUMNS` di atas.

**Hasil.** Satu objek berisi id dan baris akuarium, atau kosong bila akuarium tidak ada atau id tidak valid. Pemanggil memakainya untuk membaca pengaturan akuarium bagi alat.

**SQL.**

```sql
select ${AQUARIUM_SELECT_COLUMNS}
from aquariums a left join device_state ds on ds.aquarium_id = a.id
where a.id = $1
-- ${AQUARIUM_SELECT_COLUMNS} diganti dengan daftar kolom dari potongan di atas
```

`$1` = id akuarium.

Penjelasan kode: [getAquariumById](#getaquariumbyid).

#### Query `findAccessibleAquarium`

[aquarium-repository.js:31](../backend/config/aquarium-repository.js#L31) · query

**Tujuan.** Mengambil data satu akuarium sekaligus memeriksa apakah seorang pengguna boleh mengaksesnya dan sebagai apa. Dipakai semua route di [backend/routes/aquariums.js](../backend/routes/aquariums.js) yang memuat `:aquariumId`.

**Cara kerja.**

* Id diperiksa dulu di kode; bila tidak valid, hasilnya kosong tanpa bertanya ke database.
* Baris dibaca dari [aquariums](#aquariums), digabung dengan [device_state](#device_state) (keadaan terkini) dan [aquarium_members](#aquarium_members) (peran pengguna ini di akuarium tersebut, bila ada).
* Kolom `viewer_access` bernilai benar bila pemantauan akuarium terbuka untuk umum dan pengguna belum menjadi anggota akuarium mana pun. Subquery `not exists` memeriksa seluruh tabel anggota untuk pengguna ini.
* Bila opsi `lock` aktif, ditambahkan `for update of a`: baris akuarium dikunci sampai transaksi selesai, sehingga dua perubahan pengaturan atau pemberian pakan yang bersamaan harus antre.
* Peran akhir ditentukan di kode: admin, peran anggota, atau penonton. Bila tidak ada peran, atau peran kurang dari yang diminta, permintaan ditolak dengan error akses.

**Hasil.** Objek berisi id, baris akuarium, dan peran pengguna. Hasil kosong bila akuarium tidak ada; error ditolak bila tidak punya akses. Route lalu memakainya untuk melanjutkan atau menolak permintaan.

**SQL.**

```sql
select ${AQUARIUM_SELECT_COLUMNS}, m.role as member_role,
       (a.monitoring_public and not exists (select 1 from aquarium_members x where x.user_id = $2)) as viewer_access
from aquariums a
left join device_state ds on ds.aquarium_id = a.id
left join aquarium_members m on m.aquarium_id = a.id and m.user_id = $2
where a.id = $1
-- baris berikut hanya ditambahkan bila opsi lock aktif:
for update of a
-- ${AQUARIUM_SELECT_COLUMNS} diganti dengan daftar kolom dari potongan di atas
```

`$1` = id akuarium, `$2` = id pengguna yang meminta.

Penjelasan kode: [findAccessibleAquarium](#findaccessibleaquarium).

#### Query `getLightingAverageHours`

[aquarium-repository.js:52](../backend/config/aquarium-repository.js#L52) · query

**Tujuan.** Menghitung berapa total detik lampu menyala dan mati selama 7 hari catatan terakhir sebuah akuarium. Dari angka ini, kode menghitung rata-rata jam lampu menyala per hari. Dipanggil oleh `buildAquariumResponse`.

**Cara kerja.**

* Subquery mengambil dari [lighting_usage](#lighting_usage) kolom detik menyala dan detik mati milik akuarium ini.
* Baris diurutkan dari hari terbaru (`order by day desc`) lalu dibatasi 7 baris dengan `limit 7`.
* Query luar menjumlahkan detik menyala dan detik mati; `coalesce(..., 0)` membuat hasilnya 0 bila belum ada data sama sekali.
* Database hanya menjumlahkan. Rata-rata jam per hari dihitung di kode dari perbandingan keduanya.

**Hasil.** Satu baris berisi jumlah detik menyala dan mati. Kode memakainya untuk menghitung rata-rata jam menyala dan mati per hari, atau mengembalikan kosong bila belum ada data.

**SQL.**

```sql
select coalesce(sum(on_seconds), 0) as on_seconds, coalesce(sum(off_seconds), 0) as off_seconds
from (select on_seconds, off_seconds from lighting_usage where aquarium_id = $1 order by day desc limit 7) recent
```

`$1` = id akuarium.

Penjelasan kode: [getLightingAverageHours](#getlightingaveragehours).

#### Query `buildAquariumResponse`

[aquarium-repository.js:74](../backend/config/aquarium-repository.js#L74) · query

**Tujuan.** Menyusun data akuarium yang dikirim ke tampilan. Dipakai oleh [GET /api/aquariums/:aquariumId](#get-apiaquariumsaquariumid).

**Cara kerja.**

* Fungsi ini tidak punya perintah database sendiri. Semua data akuarium sudah dibaca lebih dulu oleh `findAccessibleAquarium`.
* Satu-satunya pertanyaan tambahan ke database dijalankan oleh `getLightingAverageHours`, yang membaca [lighting_usage](#lighting_usage); hasilnya digabungkan ke pengaturan lampu.
* Sisanya hanya merapikan kolom menjadi bentuk yang dikirim ke tampilan.

**Hasil.** Objek akuarium lengkap (nama, peran, keadaan terkini, pengaturan, dan rata-rata jam lampu) yang dikirim ke tampilan. Perintah SQL-nya ada di entri `getLightingAverageHours` di atas, bukan di fungsi ini.

Penjelasan kode: [buildAquariumResponse](#buildaquariumresponse).

### Query backend/config/database.js

[backend/config/database.js](../backend/config/database.js)

File ini adalah pintu tunggal ke database PostgreSQL (Supabase). Ia menyediakan dua cara mengirim perintah: `queryDatabase` untuk satu perintah biasa, dan `runInTransaction` untuk beberapa perintah yang harus berhasil atau gagal bersama-sama. Hampir semua file backend lain memakai salah satu dari keduanya.

Kedua fungsi ini tidak membawa teks SQL sendiri (kecuali kata `begin`, `commit`, dan `rollback` untuk mengatur transaksi). Teks perintah selalu datang dari pemanggil, dan nilai dari pengguna dikirim terpisah sebagai parameter, bukan digabung ke teks, sehingga aman dari penyusupan perintah.

Pada `runInTransaction`, bila ada langkah yang gagal, semua perubahan sebelumnya dalam paket itu dibatalkan lewat `rollback`, dan koneksi selalu dikembalikan ke kumpulan koneksi, baik berhasil maupun gagal.

#### Query `queryDatabase`

[database.js:24](../backend/config/database.js#L24) · query

**Tujuan.** Jalan pintas untuk mengirim satu perintah SQL ke database lewat kumpulan koneksi, tanpa transaksi. Hampir semua route dan utilitas memakainya untuk membaca atau mengubah satu hal sederhana.

**Cara kerja.**

* Fungsi ini tidak punya SQL sendiri. Teks perintah dan nilainya diterima dari pemanggil, lalu diteruskan apa adanya ke `databasePool.query`.
* Satu koneksi dipinjam dari kumpulan, perintah dijalankan, lalu koneksi langsung dikembalikan.
* Nilai dari pengguna dikirim sebagai parameter terpisah (`$1`, `$2`, dan seterusnya), bukan disisipkan ke teks perintah.

**Hasil.** Hasil mentah dari database (daftar baris dan jumlah baris yang terpengaruh), yang kemudian diolah oleh pemanggil. Fungsi ini tidak punya perintah SQL sendiri; lihat entri tiap pemanggil untuk isi perintahnya, misalnya [loadGlobalRole](#loadglobalrole).

Penjelasan kode: [queryDatabase](#querydatabase).

#### Query `runInTransaction`

[database.js:30](../backend/config/database.js#L30) · query

**Tujuan.** Menjalankan beberapa langkah database sebagai satu paket: semuanya disimpan bersama, atau semuanya dibatalkan bila ada yang gagal. Dipakai saat beberapa perubahan harus konsisten, yaitu oleh [POST /api/auth/session](#post-apiauthsession), [PUT /api/users/:userId](#put-apiusersuserid), [POST /api/admin/aquariums](#post-apiadminaquariums), [createConfigPatchHandler](#createconfigpatchhandler), [POST /api/aquariums/:aquariumId/feeder/trigger](#post-apiaquariumsaquariumidfeedertrigger), [POST /api/hardware/:aquariumId/telemetry](#post-apihardwareaquariumidtelemetry), dan [notifyDeviceOffline](#notifydeviceoffline).

**Cara kerja.**

* Satu koneksi khusus dipinjam dari kumpulan, lalu dikirim perintah `begin` untuk membuka transaksi.
* Fungsi kerja dari pemanggil dijalankan memakai koneksi yang sama, sehingga semua perintahnya berada dalam satu paket.
* Bila semuanya lancar, `commit` menyimpan semua perubahan sekaligus.
* Bila ada yang gagal, `rollback` membatalkan semua perubahan paket itu, lalu error dilempar kembali ke pemanggil.
* Pada akhirnya, koneksi selalu dikembalikan ke kumpulan, apa pun hasilnya.

**Hasil.** Nilai yang dikembalikan oleh fungsi kerja pemanggil, atau error bila paket dibatalkan.

**SQL.**

```sql
begin
-- ... perintah-perintah dari pemanggil dijalankan di sini
commit
-- bila ada yang gagal, yang dijalankan adalah:
rollback
```

Penjelasan kode: [runInTransaction](#runintransaction).

### Query backend/index.js

[backend/index.js](../backend/index.js)

File ini hanya menjalankan satu perintah database, yaitu pengecekan koneksi sederhana saat server baru menyala. Perintah ini tidak membaca atau mengubah tabel apa pun; tujuannya semata-mata memastikan alamat database di pengaturan sudah benar dan database bisa dijangkau.

Kalau pengecekan gagal, server tidak berhenti. Kesalahannya hanya dicatat di log, sehingga masalah koneksi langsung terlihat di konsol tanpa membuat seluruh layanan mati.

#### Query `app.listen`

[index.js:63](../backend/index.js#L63) · query

**Tujuan.** Memastikan server bisa terhubung ke database sesaat setelah server menyala. Ia tidak mengambil data apa pun, hanya "mengetuk pintu" database.

**Cara kerja.**

* Perintah `select 1` meminta database menjawab angka 1. Perintah ini tidak menyentuh tabel apa pun.
* Perintah dikirim lewat `queryDatabase`, yaitu jalan pintas ke kumpulan koneksi database.
* Bila ada jawaban, konsol mencetak "Database connected". Bila gagal, konsol mencetak "Database connection failed" beserta pesan errornya, dan server tetap berjalan.

**Hasil.** Hanya pesan di log konsol. Tidak ada data yang dikembalikan ke pengguna dan tidak ada yang disimpan.

**SQL.**

```sql
select 1
```

Penjelasan kode: [app.listen](#applisten).

### Query backend/middleware/auth.js

[backend/middleware/auth.js](../backend/middleware/auth.js)

File ini menjalankan dua pertanyaan database kecil yang sering dipakai untuk mengenali siapa yang mengirim permintaan. Yang pertama mencari peran umum pengguna (admin atau user biasa) di tabel `profiles`; yang kedua mencari alat ESP32 dari sidik digital kuncinya di tabel `devices`.

Keduanya dibantu ingatan sementara (cache) selama 5 menit supaya database tidak ditanya terus pada setiap permintaan. Ingatan peran dibuang bila peran seseorang berubah, dan ingatan kunci alat dibuang bila alat didaftarkan atau dicabut, sehingga perubahan langsung berlaku. Kedua pertanyaan ini hanya membaca, tidak mengubah apa pun.

#### Query `loadGlobalRole`

[auth.js:33](../backend/middleware/auth.js#L33) · query

**Tujuan.** Mencari peran umum seorang pengguna (admin atau user biasa) berdasarkan id dari token loginnya. Dijalankan pada setiap permintaan yang membawa token login, kecuali bila jawabannya masih diingat.

**Cara kerja.**

* Cache peran dicek dulu; bila ada jawaban yang masih berlaku (maksimal 5 menit), database tidak ditanya.
* Bila belum ada, baris dibaca dari [profiles](#profiles) dengan filter `id = $1`.
* Hanya kolom `role` yang diambil, dan paling banyak satu baris kembali.
* Pengguna yang belum punya profil dianggap user biasa. Jawaban lalu disimpan di cache, dan cache dibuang bila peran berubah.

**Hasil.** Teks "admin" atau "user" yang disimpan sebagai peran pengguna pada permintaan itu. Route dan middleware lain memakainya untuk memutuskan boleh atau tidaknya sebuah aksi.

**SQL.**

```sql
select role from profiles where id = $1
```

`$1` = id pengguna (dari token login).

Penjelasan kode: [loadGlobalRole](#loadglobalrole).

#### Query `requireDeviceKey`

[auth.js:86](../backend/middleware/auth.js#L86) · query

**Tujuan.** Mengenali alat ESP32 yang mengirim data, yaitu memastikan kunci yang dibawa terdaftar dan mencari tahu akuarium mana yang dimilikinya. Hasil ini dipakai oleh semua route `/api/hardware`.

**Cara kerja.**

* Kunci dari alat diubah menjadi sidik digitalnya (SHA-256); kunci aslinya tidak pernah disimpan atau dibandingkan langsung.
* Cache dicek dulu; bila sidik itu sudah pernah dicari dalam 5 menit terakhir, database tidak ditanya.
* Bila belum, baris dibaca dari [devices](#devices) dengan filter `key_hash = $1`, dan hanya id alat serta id akuarium yang diambil.
* Hasilnya, termasuk "kunci tidak dikenal", disimpan di cache dan dibuang saat alat didaftarkan atau dicabut.

**Hasil.** Id alat dan id akuarium untuk permintaan itu, atau penolakan "kunci tidak valid" bila sidik tidak ditemukan.

**SQL.**

```sql
select id, aquarium_id from devices where key_hash = $1
```

`$1` = sidik digital (SHA-256) dari kunci alat.

Penjelasan kode: [requireDeviceKey](#requiredevicekey).

### Query backend/routes/admin.js

[backend/routes/admin.js](../backend/routes/admin.js)

File ini memuat semua perintah database untuk halaman admin: mengatur peran pengguna di tabel `profiles`, membuat dan mengubah akuarium di tabel `aquariums` (beserta pemilik di `aquarium_members`), dan mendaftarkan atau mencabut alat di tabel `devices`. Semua route di sini sudah dijaga agar hanya admin yang bisa memakainya.

Pembuatan akuarium memakai transaksi: akuarium dan pemiliknya disimpan bersama, atau dua-duanya dibatalkan. Bila id akuarium sudah dipakai, database menolak dengan kode bentrokan (`23505`) dan dijawab 409. Hal yang sama berlaku untuk pendaftaran alat: aturan "satu akuarium satu alat" dan sidik kunci yang unik dijaga langsung oleh database.

Beberapa perintah dirakit dari potongan yang berubah-ubah (misalnya daftar kolom yang diubah), tetapi nama kolomnya selalu dari kode sendiri, dan nilainya dikirim terpisah sebagai parameter. Sidik kunci alat (`key_hash`) sengaja tidak pernah dibaca kembali agar tidak bocor.

#### Query `GET /api/admin/users`

[admin.js:31](../backend/routes/admin.js#L31) · query

**Tujuan.** Membuat daftar semua pengguna untuk admin, lengkap dengan akuarium yang diikuti dan perannya di tiap akuarium.

**Cara kerja.**

* Dimulai dari tabel [profiles](#profiles), satu baris per orang.
* Digabung dengan [aquarium_members](#aquarium_members) dan [aquariums](#aquariums) lewat `left join`, sehingga orang yang belum punya akuarium pun tetap muncul.
* `group by p.id` menggabungkan baris per orang; `json_agg` membuat daftar akuarium (id, nama, peran) yang diurutkan menurut nama akuarium.
* Filter `filter (where a.id is not null)` membuang entri kosong, dan `coalesce` memberi daftar kosong `[]` bagi orang tanpa akuarium.
* Hasil diurutkan menurut email.

**Hasil.** Daftar pengguna; peran akses tertingginya (admin, owner, member, atau viewer) dihitung di kode lalu dikirim ke halaman admin.

**SQL.**

```sql
select p.id as "userId", p.full_name as "fullName", p.email, p.role,
       coalesce(
           json_agg(json_build_object('aquariumId', a.id, 'name', a.name, 'role', m.role) order by a.name)
               filter (where a.id is not null),
           '[]'
       ) as aquariums
from profiles p
left join aquarium_members m on m.user_id = p.id
left join aquariums a on a.id = m.aquarium_id
group by p.id
order by p.email
```

Tidak ada parameter.

Penjelasan kode: [GET /api/admin/users](#get-apiadminusers).

#### Query `PATCH /api/admin/users/:userId`

[admin.js:68](../backend/routes/admin.js#L68) · query

**Tujuan.** Mengubah peran umum seorang pengguna menjadi admin atau user biasa. Admin tidak boleh mencabut perannya sendiri.

**Cara kerja.**

* Peran yang diminta dan id diperiksa di kode lebih dulu; id yang bukan UUID langsung dijawab tidak ditemukan.
* Satu baris di [profiles](#profiles) diperbarui: kolom `role` diisi nilai baru dan `updated_at` diisi waktu sekarang.
* Jumlah baris yang terpengaruh dicek. Bila 0, berarti pengguna tidak ada.
* Bila berhasil, ingatan peran pengguna itu dibuang agar perubahan langsung berlaku.

**Hasil.** Pesan "User role updated." atau jawaban tidak ditemukan bila pengguna tidak ada.

**SQL.**

```sql
update profiles set role = $2, updated_at = now() where id = $1
```

`$1` = id pengguna yang diubah, `$2` = peran baru (`admin` atau `user`).

Penjelasan kode: [PATCH /api/admin/users/:userId](#patch-apiadminusersuserid).

#### Query `POST /api/admin/aquariums`

[admin.js:89](../backend/routes/admin.js#L89) · query

**Tujuan.** Dipakai admin untuk membuat akuarium baru, dengan pemilik yang boleh disebutkan lewat id atau email. Akuarium dibuat dengan pengaturan bawaan.

**Cara kerja.**

**Query 1.** Mencari pemilik (hanya bila pemilik disebutkan).

* Dicari di [profiles](#profiles) lewat id (bila bentuknya UUID) atau lewat email, lalu id dan peran umumnya dibaca.
* Bila tidak ada, dijawab tidak ditemukan; bila orang itu admin, ditolak karena admin sudah punya akses penuh.

**Query 2.** Membuat akuarium (dalam transaksi).

* Satu baris ditambah ke [aquariums](#aquariums) dengan id, nama, dan lima pengaturan bawaan (info perangkat, suhu, lampu, pakan, sistem), serta id admin pembuat.
* Trigger [on_aquarium_created](#on_aquarium_created) otomatis membuat baris [device_state](#device_state) untuk akuarium itu.

**Query 3.** Mencatat pemilik (dalam transaksi yang sama, hanya bila ada pemilik).

* Satu baris ditambah ke [aquarium_members](#aquarium_members) dengan peran `owner`.

Kedua penambahan berada di satu transaksi: bila salah satu gagal, dua-duanya dibatalkan. Bila id akuarium sudah dipakai, database menolak dan route menjawab bentrok (409).

**Hasil.** Akuarium baru terbentuk dan dijawab dengan id serta namanya, atau dijawab bentrok bila id sudah ada.

**SQL.**

**Query 1.**

```sql
select id, role from profiles where id = $1
-- atau, bila pemilik disebut lewat email:
select id, role from profiles where email = $1
```

**Query 2.**

```sql
insert into aquariums (id, name, hardware_info, temp_config, lighting_config, feeder_config, system_config, created_by)
values ($1, $2, $3, $4, $5, $6, $7, $8)
```

**Query 3.**

```sql
insert into aquarium_members (aquarium_id, user_id, role) values ($1, $2, 'owner')
```

Query 1: `$1` = id atau email pemilik (email diubah ke huruf kecil). Query 2: `$1` = id akuarium, `$2` = nama, `$3` sampai `$7` = pengaturan bawaan (info perangkat, suhu, lampu, pakan, sistem), `$8` = id admin pembuat. Query 3: `$1` = id akuarium, `$2` = id pemilik.

Penjelasan kode: [POST /api/admin/aquariums](#post-apiadminaquariums).

#### Query `GET /api/admin/aquariums`

[admin.js:136](../backend/routes/admin.js#L136) · query

**Tujuan.** Membuat daftar semua akuarium untuk admin, lengkap dengan jumlah anggota, jumlah alat, dan daftar pemiliknya.

**Cara kerja.**

* Dimulai dari tabel [aquariums](#aquariums), satu baris per akuarium, diurutkan menurut nama.
* Subquery pertama menghitung anggota biasa (`role = 'member'`) di [aquarium_members](#aquarium_members).
* Subquery kedua menghitung alat milik akuarium itu di [devices](#devices).
* Subquery ketiga mengumpulkan pemilik (`role = 'owner'`) dengan menggabungkan `aquarium_members` dan [profiles](#profiles), diurutkan menurut nama, dan memberi `[]` bila tidak ada pemilik.
* Kolom `monitoring_public` ikut diambil untuk menunjukkan apakah pemantauan terbuka untuk umum.

**Hasil.** Daftar akuarium yang dikirim ke halaman admin.

**SQL.**

```sql
select a.id, a.name, a.monitoring_public as "monitoringPublic", a.created_at as "createdAt",
       (select count(*)::int from aquarium_members m where m.aquarium_id = a.id and m.role = 'member') as "memberCount",
       (select count(*)::int from devices d where d.aquarium_id = a.id) as "deviceCount",
       coalesce(
           (select json_agg(json_build_object('userId', p.id, 'fullName', p.full_name, 'email', p.email) order by p.full_name)
            from aquarium_members m join profiles p on p.id = m.user_id
            where m.aquarium_id = a.id and m.role = 'owner'),
           '[]'
       ) as owners
from aquariums a
order by a.name
```

Tidak ada parameter.

Penjelasan kode: [GET /api/admin/aquariums](#get-apiadminaquariums).

#### Query `PATCH /api/admin/aquariums/:aquariumId`

[admin.js:169](../backend/routes/admin.js#L169) · query

**Tujuan.** Mengubah nama atau status pemantauan publik sebuah akuarium. Hanya hal yang dikirim yang diubah.

**Cara kerja.**

* Id, nama, dan nilai pemantauan publik diperiksa di kode dulu. Bila tidak ada yang dikirim, dijawab error.
* Teks perintah dirakit: tiap hal yang dikirim menjadi satu potongan `kolom = $n`, digabung dengan koma.
* Satu baris di [aquariums](#aquariums) diperbarui, dan `updated_at` diisi waktu sekarang.
* Jumlah baris yang terpengaruh dicek. Bila 0, akuarium dijawab tidak ditemukan.

**Hasil.** Pesan "Aquarium updated." atau jawaban tidak ditemukan.

**SQL.**

```sql
update aquariums set ${assignments.join(", ")}, updated_at = now() where id = $1
-- ${assignments.join(", ")} diisi dinamis, misalnya: name = $2, monitoring_public = $3
```

`$1` = id akuarium, `$2` dan seterusnya = nilai baru untuk kolom yang dikirim.

Penjelasan kode: [PATCH /api/admin/aquariums/:aquariumId](#patch-apiadminaquariumsaquariumid).

#### Query `aquariumExistsById`

[admin.js:180](../backend/routes/admin.js#L180) · query

**Tujuan.** Memeriksa apakah sebuah akuarium ada. Dipakai oleh dua route alat di bawahnya sebelum mengerjakan hal lain.

**Cara kerja.**

* Bila id tidak valid, langsung dijawab tidak ada tanpa bertanya ke database.
* Selain itu, dicari satu baris dari [aquariums](#aquariums) dengan filter `id = $1`; kolomnya tidak penting, hanya ada atau tidaknya baris.
* Jumlah baris yang kembali dicek: lebih dari 0 berarti ada.

**Hasil.** Jawaban ya atau tidak (benar atau salah) untuk pemanggil.

**SQL.**

```sql
select 1 from aquariums where id = $1
```

`$1` = id akuarium.

Penjelasan kode: [aquariumExistsById](#aquariumexistsbyid).

#### Query `GET /api/admin/aquariums/:aquariumId/devices`

[admin.js:188](../backend/routes/admin.js#L188) · query

**Tujuan.** Menampilkan alat milik satu akuarium, yaitu id, nama, akuarium, dan waktu daftar.

**Cara kerja.**

**Query 1.** Memastikan akuarium ada lewat helper [aquariumExistsById](#aquariumexistsbyid). Bila tidak ada, dijawab tidak ditemukan.

**Query 2.** Membaca alat.

* Dibaca dari [devices](#devices) dengan filter `aquarium_id = $1`.
* Hanya kolom id, nama, id akuarium, dan waktu dibuat yang diambil. Sidik kunci (`key_hash`) sengaja tidak ikut agar tidak bocor.
* Diurutkan dari yang paling lama (`order by created_at`).

**Hasil.** Daftar alat yang dikirim ke halaman admin.

**SQL.**

```sql
select id, name, aquarium_id as "aquariumId", created_at as "createdAt"
from devices where aquarium_id = $1 order by created_at
```

`$1` = id akuarium.

Penjelasan kode: [GET /api/admin/aquariums/:aquariumId/devices](#get-apiadminaquariumsaquariumiddevices).

#### Query `POST /api/admin/aquariums/:aquariumId/devices`

[admin.js:206](../backend/routes/admin.js#L206) · query

**Tujuan.** Mendaftarkan alat baru ke sebuah akuarium dan menghasilkan kunci rahasia untuk alat itu.

**Cara kerja.**

**Query 1.** Memastikan akuarium ada lewat helper [aquariumExistsById](#aquariumexistsbyid); bila tidak ada, dijawab tidak ditemukan.

**Query 2.** Memeriksa apakah akuarium sudah punya alat.

* Dicari satu baris di [devices](#devices) dengan filter `aquarium_id = $1`.
* Bila ada, pendaftaran ditolak dengan jawaban bentrok (409) karena satu akuarium hanya boleh punya satu alat.

**Query 3.** Menyimpan alat baru.

* Satu baris ditambah ke [devices](#devices). Yang disimpan hanya sidik digital dari kunci acak, bukan kunci aslinya.
* `returning id` mengembalikan id alat yang baru dibuat.
* Bentrokan akibat aturan [devices_one_per_aquarium](#devices_one_per_aquarium) (dua pendaftaran serentak) atau sidik kembar juga ditolak dengan jawaban bentrok. Setelah berhasil, ingatan kunci dibuang.

**Hasil.** Id alat dan kunci aslinya, yang ditampilkan satu kali saja kepada admin untuk disalin. Kunci itu tidak bisa ditampilkan lagi.

**SQL.**

**Query 2.**

```sql
select 1 from devices where aquarium_id = $1
```

**Query 3.**

```sql
insert into devices (aquarium_id, name, key_hash, created_by) values ($1, $2, $3, $4) returning id
```

Query 2: `$1` = id akuarium. Query 3: `$1` = id akuarium, `$2` = nama alat, `$3` = sidik digital kunci, `$4` = id admin yang mendaftarkan.

Penjelasan kode: [POST /api/admin/aquariums/:aquariumId/devices](#post-apiadminaquariumsaquariumiddevices).

#### Query `DELETE /api/admin/devices/:deviceId`

[admin.js:233](../backend/routes/admin.js#L233) · query

**Tujuan.** Mencabut sebuah alat sehingga kuncinya tidak berlaku lagi.

**Cara kerja.**

* Id alat diperiksa dulu di kode; yang bukan UUID langsung dijawab tidak ditemukan.
* Baris di [devices](#devices) dengan id itu dihapus.
* Jumlah baris yang terhapus dicek; bila 0, dijawab tidak ditemukan.
* Setelah berhasil, ingatan kunci dibuang sehingga kunci yang dicabut langsung ditolak pada permintaan berikutnya.

**Hasil.** Pesan "Device revoked." atau jawaban tidak ditemukan.

**SQL.**

```sql
delete from devices where id = $1
```

`$1` = id alat.

Penjelasan kode: [DELETE /api/admin/devices/:deviceId](#delete-apiadmindevicesdeviceid).

### Query backend/routes/aquariums.js

[backend/routes/aquariums.js](../backend/routes/aquariums.js)

File ini menjalankan semua perintah database yang berkaitan dengan satu akuarium dan isinya: daftar akuarium milik pengguna, perubahan pengaturan (suhu, lampu, pakan, sistem), perintah pakan manual, riwayat dan ekspor data suhu, notifikasi (daftar, tandai dibaca, hapus), serta pengelolaan anggota akuarium. Tabel yang disentuh adalah [aquariums](#aquariums), [device_state](#device_state), [aquarium_members](#aquarium_members), [profiles](#profiles), [telemetry_history](#telemetry_history), [notifications](#notifications), dan [notification_states](#notification_states).

Sebagian besar route hanya membaca atau menulis dengan satu perintah. Dua route yang mengubah banyak hal sekaligus, yaitu perubahan pengaturan dan pemberian pakan manual, berjalan di dalam satu transaksi. Di dalamnya baris akuarium dikunci (`for update`) lebih dulu, sehingga dua orang yang mengubah akuarium yang sama pada saat bersamaan akan dijalankan satu per satu, bukan saling menimpa. Bila salah satu langkah gagal, semua perubahan dibatalkan.

Semua nilai dari pengguna dikirim lewat parameter (`$1`, `$2`, dan seterusnya), tidak pernah ditempel langsung ke teks perintah, sehingga aman dari penyisipan perintah. Penulisan status baca dan hapus notifikasi memakai `insert ... on conflict ... do update`: bila catatannya belum ada dibuat baru, bila sudah ada cukup diperbarui. Perubahan pengaturan tidak langsung sampai ke alat lewat database, melainkan lewat `publishConfigChange` setelah transaksi selesai.

#### Query `loadActorName`

[aquariums.js:59](../backend/routes/aquariums.js#L59) · query

**Tujuan.** Mencari nama lengkap orang yang melakukan sebuah perubahan, untuk dicantumkan di isi notifikasi (misalnya "Budi changed ..."). Berjalan di dalam transaksi milik pemanggilnya, tepat sebelum notifikasi disimpan.

**Cara kerja.**

* Membaca satu kolom, `full_name`, dari tabel [profiles](#profiles) (data diri pengguna).
* Barisnya dipilih lewat id pengguna yang sedang login.
* Perintah dijalankan lewat `client` milik transaksi pemanggil, jadi ikut berada di transaksi yang sama.
* Bila baris tidak ditemukan atau namanya kosong, kode memakai tulisan cadangan "A user".

**Hasil.** Satu string nama (atau "A user"). Dipakai oleh [createConfigPatchHandler](#createconfigpatchhandler) dan [POST /api/aquariums/:aquariumId/feeder/trigger](#post-apiaquariumsaquariumidfeedertrigger) untuk menyusun pesan notifikasi.

**SQL.**

```sql
select full_name from profiles where id = $1
```

`$1` = id pengguna yang melakukan perubahan.

Penjelasan kode: [loadActorName](#loadactorname).

#### Query `createConfigPatchHandler`

[aquariums.js:135](../backend/routes/aquariums.js#L135) · query

**Tujuan.** Dasar dari semua route pengubah pengaturan akuarium (suhu, lampu, pakan, sistem). Ia menyimpan perubahan pengaturan, mencatat siapa yang mengubah lewat notifikasi, lalu memberi tahu alat. Seluruh isinya berjalan dalam satu transaksi setiap kali pengguna menekan simpan di halaman pengaturan.

Sebelum transaksi dimulai, isi permintaan sudah diperiksa di kode: tidak boleh kosong, hanya boleh berisi kolom yang dikenal, dan nilainya divalidasi. Query 1 sampai 4 di bawah dijalankan berurutan di dalam transaksi.

**Query 1.** Membaca akuarium sekaligus mengunci barisnya (lewat `findAccessibleAquarium`).

**Cara kerja.**

* Membaca baris akuarium dari [aquariums](#aquariums) beserta status alatnya dari [device_state](#device_state) (digabung lewat id akuarium, dan tetap muncul walau status alat belum ada).
* Ikut digabung dengan [aquarium_members](#aquarium_members) untuk pengguna ini, supaya diketahui perannya di akuarium itu. Kolom `viewer_access` menandai apakah pengguna boleh melihat sebagai penonton karena pemantauan akuarium dibuka untuk umum dan ia belum menjadi anggota akuarium mana pun.
* Baris dipilih lewat id akuarium dan dikunci dengan `for update of a`, yaitu hanya baris di tabel [aquariums](#aquariums) yang dikunci. Orang lain yang mengubah akuarium yang sama harus menunggu sampai transaksi ini selesai.
* Peran pengguna dicek di kode: perubahan pengaturan butuh minimal peran anggota. Bila akuarium tidak ada, route menjawab tidak ditemukan; bila peran kurang, route menjawab dilarang.

**SQL.**

```sql
select ${AQUARIUM_SELECT_COLUMNS}, m.role as member_role,
       (a.monitoring_public and not exists (select 1 from aquarium_members x where x.user_id = $2)) as viewer_access
from aquariums a
left join device_state ds on ds.aquarium_id = a.id
left join aquarium_members m on m.aquarium_id = a.id and m.user_id = $2
where a.id = $1
for update of a
-- ${AQUARIUM_SELECT_COLUMNS} diisi: a.*, ds.current_temp, ds.heater_status, ds.led_status, ds.feeder_status,
-- ds.last_updated, ds.offline_notified, ds.sensor_error_notified, ds.last_history_at
-- baris "for update of a" hanya ditambahkan bila pemanggil meminta kunci (lock = true)
```

`$1` = id akuarium, `$2` = id pengguna yang login. Perintah ini ada di `backend/config/aquarium-repository.js`.

Setelah itu kode membandingkan nilai baru dengan nilai yang tersimpan. Bila tidak ada nilai yang berubah, transaksi selesai tanpa menulis apa pun dan jawabannya "No configuration changes detected". Selebihnya hanya jalan bila ada perubahan.

**Query 2.** Menyimpan pengaturan yang berubah.

**Cara kerja.**

* Mengubah satu baris di [aquariums](#aquariums), yaitu baris akuarium yang tadi dikunci.
* Pengaturan disimpan dalam kolom bertipe JSON (`temp_config`, `lighting_config`, `feeder_config`, `system_config`). Tiap kolom yang terkena perubahan digabung dengan nilai barunya lewat operator `||`, yang menimpa hanya kunci yang dikirim dan membiarkan kunci lain apa adanya.
* Nama kolom tidak berasal dari pengguna, tetapi dari daftar tetap di kode. Satuan suhu (`unit`) yang dikirim lewat route sistem dimasukkan ke kolom suhu.
* Kolom `updated_at` diisi waktu sekarang.

**SQL.**

```sql
update aquariums set ${assignments.join(", ")}, updated_at = now() where id = $1
-- ${assignments.join(", ")} diisi kode, satu potongan per kolom yang berubah, misalnya:
--   temp_config = temp_config || $2::jsonb, lighting_config = lighting_config || $3::jsonb
```

`$1` = id akuarium, `$2` dan seterusnya = isi perubahan untuk tiap kolom, dalam bentuk teks JSON.

**Query 3.** Mengambil nama pelaku untuk notifikasi, dengan `loadActorName`.

**Cara kerja.**

* Membaca `full_name` dari [profiles](#profiles) untuk pengguna yang login, di transaksi yang sama.
* Nama dipakai untuk menyusun kalimat seperti "Budi changed target temperature to 26°C".

**SQL.**

```sql
select full_name from profiles where id = $1
```

`$1` = id pengguna yang login. Lihat entri `loadActorName` di atas.

**Query 4.** Menyimpan notifikasi untuk seluruh anggota akuarium, lewat `addAquariumNotification` di `backend/utils/notification-records.js`.

**Cara kerja.**

* Menambah satu baris di tabel [notifications](#notifications) dengan cakupan akuarium, sehingga semua anggota akuarium bisa melihatnya.
* Yang disimpan: id akuarium, id dan nama pelaku, judul (misalnya "Temperature settings updated"), isi pesan, dan jenis `info`.
* `dedupe_key` kosong, sehingga aturan anti-ganda tidak berlaku dan setiap perubahan selalu tercatat. Klausa `on conflict ... do nothing` hanya melindungi notifikasi yang punya kunci.

**SQL.**

```sql
insert into notifications (scope, aquarium_id, actor_id, actor_name, title, message, type, dedupe_key)
values ('aquarium', $1, $2, $3, $4, $5, $6, $7)
on conflict (aquarium_id, dedupe_key) where dedupe_key is not null do nothing
```

`$1` = id akuarium, `$2` = id pelaku, `$3` = nama pelaku, `$4` = judul, `$5` = isi pesan, `$6` = jenis (`info`), `$7` = kunci anti-ganda (kosong di sini).

**Hasil.** Bila akuarium tidak ada, dijawab tidak ditemukan. Bila tidak ada yang berubah, dijawab "No configuration changes detected". Bila berhasil, transaksi disimpan, `publishConfigChange` dipanggil supaya alat yang sedang menunggu segera mengambil pengaturan baru (ini lewat memori, bukan database), dan pengguna menerima pesan sukses.

Penjelasan kode: [createConfigPatchHandler](#createconfigpatchhandler).

#### Query `PATCH /api/aquariums/:aquariumId/temperature-config`

[aquariums.js:231](../backend/routes/aquariums.js#L231) · query

**Tujuan.** Mengubah pengaturan suhu akuarium (satuan suhu, suhu target, batas bawah dan atas, mode, dan status kendali manual) dan mencatat notifikasi.

**Cara kerja.**

* Route ini tidak punya perintah database sendiri. Ia hanya memanggil `createConfigPatchHandler("tempConfig", ...)`.
* Kolom yang diubah adalah `temp_config` di tabel [aquariums](#aquariums). Selain validasi umum, kode memastikan batas bawah suhu tetap lebih kecil dari batas atasnya (dihitung dari nilai tersimpan digabung nilai baru).
* Seluruh perintah SQL-nya (kunci baris, update, notifikasi) dijelaskan di entri `createConfigPatchHandler`.

**Hasil.** Pesan "Temperature config updated." bila berhasil, atau "No configuration changes detected." bila tidak ada nilai yang berubah.

Penjelasan kode: [PATCH /api/aquariums/:aquariumId/temperature-config](#patch-apiaquariumsaquariumidtemperature-config).

#### Query `PATCH /api/aquariums/:aquariumId/lighting-config`

[aquariums.js:235](../backend/routes/aquariums.js#L235) · query

**Tujuan.** Mengubah pengaturan lampu akuarium (mode, status kendali manual, dan jadwal) dan mencatat notifikasi.

**Cara kerja.**

* Route ini tidak punya perintah database sendiri. Ia memanggil `createConfigPatchHandler("lightingConfig", ...)`.
* Kolom yang diubah adalah `lighting_config` di tabel [aquariums](#aquariums).
* Seluruh perintah SQL-nya dijelaskan di entri `createConfigPatchHandler`.

**Hasil.** Pesan "Lighting config updated." bila berhasil, atau "No configuration changes detected." bila tidak ada yang berubah.

Penjelasan kode: [PATCH /api/aquariums/:aquariumId/lighting-config](#patch-apiaquariumsaquariumidlighting-config).

#### Query `PATCH /api/aquariums/:aquariumId/feeder-config`

[aquariums.js:239](../backend/routes/aquariums.js#L239) · query

**Tujuan.** Mengubah pengaturan pemberi pakan (mode manual atau otomatis dan jam pakan) dan mencatat notifikasi.

**Cara kerja.**

* Route ini tidak punya perintah database sendiri. Ia memanggil `createConfigPatchHandler("feederConfig", ...)`.
* Kolom yang diubah adalah `feeder_config` di tabel [aquariums](#aquariums).
* Seluruh perintah SQL-nya dijelaskan di entri `createConfigPatchHandler`.

**Hasil.** Pesan "Feeder config updated." bila berhasil, atau "No configuration changes detected." bila tidak ada yang berubah.

Penjelasan kode: [PATCH /api/aquariums/:aquariumId/feeder-config](#patch-apiaquariumsaquariumidfeeder-config).

#### Query `PATCH /api/aquariums/:aquariumId/system-config`

[aquariums.js:240](../backend/routes/aquariums.js#L240) · query

**Tujuan.** Mengubah pengaturan sistem akuarium (seberapa sering sensor dicek, zona waktu, dan satuan suhu) dan mencatat notifikasi.

**Cara kerja.**

* Route ini tidak punya perintah database sendiri. Ia memanggil `createConfigPatchHandler("systemConfig", ...)`.
* Kolom yang diubah adalah `system_config` di tabel [aquariums](#aquariums). Bila satuan suhu (`unit`) ikut dikirim, nilainya justru disimpan di `temp_config`, karena satuan itu milik bagian suhu.
* Seluruh perintah SQL-nya dijelaskan di entri `createConfigPatchHandler`.

**Hasil.** Pesan "System config updated." bila berhasil, atau "No configuration changes detected." bila tidak ada yang berubah.

Penjelasan kode: [PATCH /api/aquariums/:aquariumId/system-config](#patch-apiaquariumsaquariumidsystem-config).

#### Query `queryTelemetryRecords`

[aquariums.js:187](../backend/routes/aquariums.js#L187) · query

**Tujuan.** Mengambil catatan riwayat suhu dan status alat untuk satu akuarium, mulai dari yang terbaru. Dipakai oleh tampilan riwayat dan oleh ekspor CSV.

**Cara kerja.**

* Sebelum bertanya ke database, kode memeriksa isian: jumlah (`limit`) harus bilangan bulat positif dan paling banyak 500, tanggal harus valid, dan tanggal awal tidak boleh lebih besar dari tanggal akhir. Bila salah, jawabannya permintaan tidak valid.
* Membaca tabel [telemetry_history](#telemetry_history) dan hanya baris milik akuarium yang diminta.
* Batas tanggal bersifat opsional. Bila tanggal awal kosong, kondisinya dilewati (`is null`); bila terisi, hanya catatan pada atau setelah waktu itu yang diambil. Hal yang sama berlaku untuk tanggal akhir.
* Diurutkan dari waktu rekam terbaru ke terlama, lalu dipotong sebanyak `limit`.
* Nama kolom diberi nama baru agar cocok dengan bentuk data yang dibaca tampilan (misalnya `recorded_at` menjadi `timestamp`).

**Hasil.** Daftar catatan, masing-masing berisi id, id akuarium, waktu, suhu, status heater, lampu, pemberi pakan, dan keterangan kejadian. Pemanggil menampilkannya atau mengubahnya menjadi CSV.

**SQL.**

```sql
select id, aquarium_id as "aquariumId", recorded_at as "timestamp", temp,
       heater_state as "heaterState", led_state as "ledState", feeder_state as "feederState", event
from telemetry_history
where aquarium_id = $1
  and ($2::timestamptz is null or recorded_at >= $2)
  and ($3::timestamptz is null or recorded_at <= $3)
order by recorded_at desc
limit $4
```

`$1` = id akuarium, `$2` = tanggal awal (boleh kosong), `$3` = tanggal akhir (boleh kosong), `$4` = jumlah maksimum catatan.

Penjelasan kode: [queryTelemetryRecords](#querytelemetryrecords).

#### Query `GET /api/aquariums`

[aquariums.js:205](../backend/routes/aquariums.js#L205) · query

**Tujuan.** Menyusun daftar akuarium yang boleh dilihat pengguna yang sedang login, untuk pilihan akuarium di dashboard. Yang dijalankan hanya salah satu dari dua query di bawah, tergantung apakah pengguna admin.

**Query 1.** Untuk admin.

**Cara kerja.**

* Membaca semua baris di tabel [aquariums](#aquariums), tanpa filter.
* Peran ditulis langsung sebagai teks `'admin'` untuk setiap baris, karena admin punya akses penuh ke semua akuarium.
* Diurutkan menurut nama.

**SQL.**

```sql
select id, name, 'admin' as role from aquariums order by name
```

**Query 2.** Untuk pengguna biasa.

**Cara kerja.**

* Gabungan dua daftar (`union all`), lalu hasil gabungan diurutkan menurut nama.
* Daftar pertama: akuarium yang pengguna ikuti sebagai anggota atau pemilik. Tabel [aquarium_members](#aquarium_members) disaring untuk pengguna ini, lalu digabung (`join`) dengan [aquariums](#aquariums) untuk mendapat nama. Perannya diambil dari data keanggotaan.
* Daftar kedua: akuarium yang pemantauannya dibuka untuk umum (`monitoring_public`), dengan peran `'viewer'` (penonton).
* Daftar kedua hanya berlaku bila pengguna belum menjadi anggota akuarium mana pun (`not exists`). Jadi penonton hanya melihat akuarium publik bila ia belum punya akuarium sendiri.

**SQL.**

```sql
select id, name, role from (
    select a.id, a.name, m.role
    from aquarium_members m join aquariums a on a.id = m.aquarium_id
    where m.user_id = $1
    union all
    select a.id, a.name, 'viewer' as role
    from aquariums a
    where a.monitoring_public
      and not exists (select 1 from aquarium_members x where x.user_id = $1)
) access
order by name
```

`$1` = id pengguna yang login.

**Hasil.** Daftar akuarium berisi id, nama, dan peran pengguna di akuarium itu, dikirim sebagai `aquariums`.

Penjelasan kode: [GET /api/aquariums](#get-apiaquariums).

#### Query `GET /api/aquariums/:aquariumId`

[aquariums.js:225](../backend/routes/aquariums.js#L225) · query

**Tujuan.** Menampilkan detail satu akuarium: pengaturan, status alat terakhir, dan rata-rata jam lampu menyala. Dipakai saat halaman akuarium dibuka.

**Cara kerja.**

* Route ini tidak punya perintah database sendiri, tetapi memanggil dua fungsi pembantu.
* `findAccessibleAquarium` (minimal peran penonton, tanpa kunci) membaca baris dari [aquariums](#aquariums), status alat dari [device_state](#device_state), dan peran pengguna dari [aquarium_members](#aquarium_members), dalam satu perintah. Perintahnya sama dengan Query 1 di entri `createConfigPatchHandler`, tetapi tanpa `for update`, karena hanya membaca.
* `buildAquariumResponse` lalu menambahkan rata-rata jam lampu menyala dan mati. Datanya dari [lighting_usage](#lighting_usage): jumlah detik menyala dan mati pada 7 hari terakhir dijumlahkan, lalu diubah menjadi rata-rata jam per hari.
* Bila akuarium tidak ada, dijawab tidak ditemukan; bila pengguna tidak berhak, dijawab dilarang.

**Hasil.** Satu objek akuarium lengkap yang dikirim ke tampilan.

Penjelasan kode: [GET /api/aquariums/:aquariumId](#get-apiaquariumsaquariumid).

#### Query `POST /api/aquariums/:aquariumId/feeder/trigger`

[aquariums.js:253](../backend/routes/aquariums.js#L253) · query

**Tujuan.** Memberi pakan secara manual dari tampilan. Dipakai saat pengguna menekan tombol beri pakan. Semuanya berjalan dalam satu transaksi.

**Query 1.** Membaca akuarium dan mengunci barisnya (lewat `findAccessibleAquarium`).

**Cara kerja.**

* Memakai perintah yang sama dengan Query 1 di entri [createConfigPatchHandler](#createconfigpatchhandler): membaca [aquariums](#aquariums), [device_state](#device_state), dan peran di [aquarium_members](#aquarium_members), dengan `for update of a` untuk mengunci baris akuarium.
* Pengguna harus minimal anggota. Bila akuarium tidak ada, dijawab tidak ditemukan.
* Kode lalu memeriksa bahwa mode pakan (`feeder_config`) adalah `MANUAL`. Bila bukan, transaksi selesai tanpa menulis apa pun dan jawabannya konflik (409) dengan pesan agar beralih dulu ke mode manual.

**Query 2.** Mencatat waktu perintah pakan.

**Cara kerja.**

* Mengubah satu baris di [aquariums](#aquariums) dengan mengisi `feeder_last_triggered_at` memakai waktu sekarang.
* Alat tidak dihubungi langsung. Saat alat mengambil pengaturan, ia melihat bahwa waktu ini berubah dan tahu ada perintah pakan.

**SQL.**

```sql
update aquariums set feeder_last_triggered_at = now() where id = $1
```

`$1` = id akuarium.

**Query 3.** Mengambil nama pelaku, dengan `loadActorName`: `select full_name from profiles where id = $1` dari [profiles](#profiles). Lihat entri [loadActorName](#loadactorname).

**Query 4.** Menyimpan notifikasi "Feed Command Sent".

**Cara kerja.**

* Menambah satu baris di [notifications](#notifications) dengan cakupan akuarium, lewat `addAquariumNotification`. Judulnya "Feed Command Sent" dan pesannya "(nama) sent a manual feed command."
* Perintah SQL-nya sama dengan Query 4 di entri [createConfigPatchHandler](#createconfigpatchhandler).

**Hasil.** Setelah transaksi tersimpan, `publishConfigChange` dipanggil agar alat yang sedang menunggu segera mengambil pengaturan, dan pengguna menerima "Feed command sent."

Penjelasan kode: [POST /api/aquariums/:aquariumId/feeder/trigger](#post-apiaquariumsaquariumidfeedertrigger).

#### Query `GET /api/aquariums/:aquariumId/telemetry/export`

[aquariums.js:275](../backend/routes/aquariums.js#L275) · query

**Tujuan.** Mengunduh riwayat data alat sebagai berkas CSV, untuk dibuka di Excel atau aplikasi lain.

**Cara kerja.**

* Route ini tidak punya perintah database sendiri. Pertama `findAccessibleAquarium` memastikan akuarium ada dan pengguna minimal anggota (penonton tidak boleh mengunduh).
* Lalu `queryTelemetryRecords` membaca riwayat dari [telemetry_history](#telemetry_history). Bila `limit` tidak diisi, dipakai 500 catatan (paling banyak yang diizinkan), terbaru lebih dulu. Perintahnya dijelaskan di entri [queryTelemetryRecords](#querytelemetryrecords).
* Hasilnya disusun menjadi teks CSV di kode. Sel yang diawali tanda yang bisa dianggap rumus oleh Excel diberi awalan tanda petik agar tidak dijalankan sebagai rumus.

**Hasil.** Berkas CSV dengan kolom waktu, suhu, status heater, lampu, pemberi pakan, dan kejadian, bernama `telemetry-` diikuti tanggal hari ini.

Penjelasan kode: [GET /api/aquariums/:aquariumId/telemetry/export](#get-apiaquariumsaquariumidtelemetryexport).

#### Query `GET /api/aquariums/:aquariumId/telemetry`

[aquariums.js:295](../backend/routes/aquariums.js#L295) · query

**Tujuan.** Menampilkan riwayat data alat untuk satu akuarium, misalnya untuk grafik dan tabel riwayat di dashboard.

**Cara kerja.**

* Route ini tidak punya perintah database sendiri. Pertama `findAccessibleAquarium` memastikan akuarium ada dan pengguna minimal penonton.
* Lalu `queryTelemetryRecords` membaca [telemetry_history](#telemetry_history) sesuai isian `limit`, `startDate`, dan `endDate` dari alamat permintaan. Bila `limit` kosong, dipakai 40 catatan, terbaru lebih dulu. Perintahnya dijelaskan di entri [queryTelemetryRecords](#querytelemetryrecords).

**Hasil.** Daftar catatan (`telemetryRecords`) dan jumlahnya (`total`, yaitu banyaknya catatan yang dikirim, bukan seluruh riwayat).

Penjelasan kode: [GET /api/aquariums/:aquariumId/telemetry](#get-apiaquariumsaquariumidtelemetry).

#### Query `NOTIFICATION_STATE_JOIN`

[aquariums.js:302](../backend/routes/aquariums.js#L302) · query

**Tujuan.** Potongan teks perintah yang dipakai ulang agar notifikasi digabung dengan status baca dan hapus milik satu pengguna tertentu. Ia bukan perintah utuh, tetapi disisipkan ke tiga perintah notifikasi lain: daftar notifikasi, tandai semua dibaca, dan `isNotificationVisibleToUser`.

**Cara kerja.**

* Mengambil baris dari tabel [notifications](#notifications) dengan nama pendek `n`.
* Menggabungkannya dengan [notification_states](#notification_states) (`s`) lewat `left join`. Artinya notifikasi tetap muncul walau pengguna belum pernah membaca atau menghapusnya (kolom `s` akan kosong).
* Gabungan hanya mencocokkan catatan milik pengguna yang sedang login (`s.user_id = $2`), karena status baca dan hapus bersifat pribadi.
* Pemanggil menambahkan syarat `VISIBLE_NOTIFICATION_CONDITION` dari `backend/utils/notification-records.js`: notifikasi harus milik akuarium ini atau milik pengguna ini secara pribadi, dan belum dihapus oleh pengguna ini.

**Hasil.** Kumpulan baris notifikasi beserta status baca dan hapus pengguna, yang masih harus dilengkapi pemanggil dengan `select`, `where`, dan seterusnya.

**SQL.**

```sql
from notifications n
left join notification_states s on s.notification_id = n.id and s.user_id = $2
-- VISIBLE_NOTIFICATION_CONDITION (di notification-records.js) berisi:
--   ((n.scope = 'aquarium' and n.aquarium_id = $1) or (n.scope = 'user' and n.recipient_id = $2))
--   and s.dismissed_at is null
```

`$1` = id akuarium, `$2` = id pengguna yang login.

Penjelasan kode: `NOTIFICATION_STATE_JOIN`.

#### Query `GET /api/aquariums/:aquariumId/notifications`

[aquariums.js:318](../backend/routes/aquariums.js#L318) · query

**Tujuan.** Menampilkan daftar notifikasi untuk pengguna pada satu akuarium, untuk panel notifikasi di dashboard.

**Cara kerja.**

* Pertama `findAccessibleAquarium` memastikan akuarium ada dan pengguna minimal penonton. Kode juga memeriksa `limit` (bilangan bulat positif, bawaan 100, maksimum 500) dan `readStatus` (hanya `read` atau `unread`).
* Membaca [notifications](#notifications) yang digabung dengan [notification_states](#notification_states) lewat `NOTIFICATION_STATE_JOIN`.
* Yang tampil: notifikasi akuarium ini dan notifikasi pribadi pengguna, selama belum dihapus oleh pengguna itu.
* Bila `readStatus` diisi, hasil disaring menurut sudah atau belum dibaca. Bila kosong, filter dilewati (`is null`).
* Diurutkan dari yang terbaru, dipotong sebanyak `limit`.
* Kolom `isRead` bernilai benar bila pengguna ini punya catatan waktu baca (`read_at`). Notifikasi pribadi diberi `scope` `user`, sisanya `aquarium`.

**Hasil.** Daftar notifikasi (`notificationRecords`) berisi id, cakupan, id akuarium, nama pelaku, judul, pesan, jenis, waktu, dan status sudah dibaca.

**SQL.**

```sql
select n.id, case when n.scope = 'user' then 'user' else 'aquarium' end as scope,
       n.aquarium_id as "aquariumId", n.actor_name as "actorName", n.title, n.message, n.type,
       n.created_at as "timestamp", (s.read_at is not null) as "isRead"
${NOTIFICATION_STATE_JOIN}
where ${VISIBLE_NOTIFICATION_CONDITION}
  and ($3::boolean is null or (s.read_at is not null) = $3)
order by n.created_at desc
limit $4
-- ${NOTIFICATION_STATE_JOIN} diisi: from notifications n left join notification_states s ... (lihat entri NOTIFICATION_STATE_JOIN)
-- ${VISIBLE_NOTIFICATION_CONDITION} diisi syarat akuarium atau pribadi, dan belum dihapus
```

`$1` = id akuarium, `$2` = id pengguna, `$3` = true bila hanya yang sudah dibaca, false bila hanya yang belum dibaca, kosong bila semuanya, `$4` = jumlah maksimum.

Penjelasan kode: [GET /api/aquariums/:aquariumId/notifications](#get-apiaquariumsaquariumidnotifications).

#### Query `PATCH /api/aquariums/:aquariumId/notifications/read-all`

[aquariums.js:337](../backend/routes/aquariums.js#L337) · query

**Tujuan.** Menandai semua notifikasi yang terlihat dan belum dibaca sebagai sudah dibaca oleh pengguna ini, saat ia menekan tombol "tandai semua dibaca". Minimal peran anggota.

**Cara kerja.**

* Memilih notifikasi dari [notifications](#notifications) yang terlihat bagi pengguna ini (milik akuarium atau pribadi, belum dihapus) dan yang belum dibaca (`s.read_at is null`), lewat `NOTIFICATION_STATE_JOIN`.
* Untuk setiap notifikasi itu disimpan satu catatan di [notification_states](#notification_states) dengan waktu baca sekarang. Nilai id notifikasi dan id pengguna dipasangkan dalam satu perintah (`insert ... select`), jadi tidak perlu satu-satu.
* Bila catatan untuk pasangan (notifikasi, pengguna) sudah ada, waktu bacanya diperbarui (`on conflict ... do update`).

**Hasil.** Pesan "All notifications marked as read." Tidak ada data yang dikembalikan; tampilan cukup memuat ulang daftar.

**SQL.**

```sql
insert into notification_states (notification_id, user_id, read_at)
select n.id, $2, now()
${NOTIFICATION_STATE_JOIN}
where ${VISIBLE_NOTIFICATION_CONDITION} and s.read_at is null
on conflict (notification_id, user_id) do update set read_at = now()
-- ${NOTIFICATION_STATE_JOIN} dan ${VISIBLE_NOTIFICATION_CONDITION} diisi seperti di entri NOTIFICATION_STATE_JOIN
```

`$1` = id akuarium, `$2` = id pengguna.

Penjelasan kode: [PATCH /api/aquariums/:aquariumId/notifications/read-all](#patch-apiaquariumsaquariumidnotificationsread-all).

#### Query `isNotificationVisibleToUser`

[aquariums.js:351](../backend/routes/aquariums.js#L351) · query

**Tujuan.** Memeriksa apakah sebuah notifikasi memang boleh dilihat pengguna. Dipakai oleh route tandai dibaca dan hapus sebagai pemeriksaan sebelum menulis, supaya pengguna tidak bisa mengubah notifikasi orang lain.

**Cara kerja.**

* Bila id notifikasi bukan format UUID yang benar, jawabannya langsung tidak, tanpa bertanya ke database.
* Membaca [notifications](#notifications) yang digabung dengan [notification_states](#notification_states) lewat `NOTIFICATION_STATE_JOIN`, hanya untuk id notifikasi yang diminta.
* Syaratnya sama dengan daftar notifikasi: milik akuarium ini atau pribadi pengguna, dan belum dihapus oleh pengguna.
* Yang dibaca hanya angka 1 sebagai penanda ada baris; isinya tidak dipakai. Kode hanya menghitung jumlah baris.

**Hasil.** Benar bila ada satu baris yang cocok, salah bila tidak. Bila salah, route menjawab "Notification was not found."

**SQL.**

```sql
select 1 ${NOTIFICATION_STATE_JOIN} where n.id = $3 and ${VISIBLE_NOTIFICATION_CONDITION}
-- ${NOTIFICATION_STATE_JOIN} dan ${VISIBLE_NOTIFICATION_CONDITION} diisi seperti di entri NOTIFICATION_STATE_JOIN
```

`$1` = id akuarium, `$2` = id pengguna, `$3` = id notifikasi.

Penjelasan kode: [isNotificationVisibleToUser](#isnotificationvisibletouser).

#### Query `PATCH /api/aquariums/:aquariumId/notifications/:notificationId/read`

[aquariums.js:366](../backend/routes/aquariums.js#L366) · query

**Tujuan.** Menandai satu notifikasi sudah dibaca oleh pengguna, biasanya saat notifikasi itu diklik. Minimal peran anggota.

**Cara kerja.**

* Pertama dicek lewat `isNotificationVisibleToUser` bahwa notifikasi itu memang terlihat bagi pengguna.
* Lalu satu catatan disimpan di [notification_states](#notification_states) untuk pasangan (notifikasi, pengguna), dengan waktu baca sekarang.
* Bila catatan sudah ada (pernah dibaca, atau sebelumnya dilihat dengan status lain), baris itu diperbarui, bukan dibuat ganda. Dengan `coalesce`, waktu baca yang pertama tetap dipertahankan bila sudah terisi.

**Hasil.** Pesan "Notification marked as read."

**SQL.**

```sql
insert into notification_states (notification_id, user_id, read_at) values ($1, $2, now())
on conflict (notification_id, user_id) do update set read_at = coalesce(notification_states.read_at, now())
```

`$1` = id notifikasi, `$2` = id pengguna.

Penjelasan kode: [PATCH /api/aquariums/:aquariumId/notifications/:notificationId/read](#patch-apiaquariumsaquariumidnotificationsnotificationidread).

#### Query `DELETE /api/aquariums/:aquariumId/notifications/:notificationId`

[aquariums.js:382](../backend/routes/aquariums.js#L382) · query

**Tujuan.** Menghapus satu notifikasi dari tampilan pengguna. Minimal peran anggota.

**Cara kerja.**

* Pertama dicek lewat `isNotificationVisibleToUser` bahwa notifikasi itu terlihat bagi pengguna.
* Lalu disimpan satu catatan di [notification_states](#notification_states) dengan waktu hapus (`dismissed_at`) sekarang. Bila catatannya sudah ada, hanya waktu hapus yang diperbarui dan waktu baca tidak berubah.
* Ini hanya menyembunyikan notifikasi untuk pengguna itu. Barisnya di [notifications](#notifications) tidak dihapus, sehingga anggota lain masih bisa melihatnya. Notifikasi yang sudah dihapus tidak lolos syarat tampil di semua perintah notifikasi lain.

**Hasil.** Pesan "Notification deleted."

**SQL.**

```sql
insert into notification_states (notification_id, user_id, dismissed_at) values ($1, $2, now())
on conflict (notification_id, user_id) do update set dismissed_at = now()
```

`$1` = id notifikasi, `$2` = id pengguna.

Penjelasan kode: [DELETE /api/aquariums/:aquariumId/notifications/:notificationId](#delete-apiaquariumsaquariumidnotificationsnotificationid).

#### Query `GET /api/aquariums/:aquariumId/members`

[aquariums.js:395](../backend/routes/aquariums.js#L395) · query

**Tujuan.** Menampilkan anggota satu akuarium untuk halaman Access. Hanya pemilik akuarium atau admin yang boleh melihat.

**Cara kerja.**

* Pertama `findAccessibleAquarium` memastikan akuarium ada dan pengguna minimal pemilik; bila kurang, dijawab dilarang.
* Membaca [aquarium_members](#aquarium_members) untuk akuarium ini, digabung (`join`) dengan [profiles](#profiles) agar nama lengkap dan email ikut terbawa.
* Admin melihat semua (pemilik dan anggota). Pemilik biasa hanya melihat yang berperan anggota. Ini diatur lewat parameter `$2` yang bernilai benar bila pengguna admin: `($2 or m.role = 'member')`.
* Diurutkan menurut peran (pemilik di atas anggota, karena `owner` jatuh setelah `member` bila diurutkan menurun) lalu menurut nama.

**Hasil.** Daftar `members` berisi id pengguna, peran, nama lengkap, dan email.

**SQL.**

```sql
select m.user_id as "userId", m.role, p.full_name as "fullName", p.email
from aquarium_members m join profiles p on p.id = m.user_id
where m.aquarium_id = $1 and ($2 or m.role = 'member')
order by m.role desc, p.full_name
```

`$1` = id akuarium, `$2` = benar bila pengguna admin (boleh melihat pemilik juga).

Penjelasan kode: [GET /api/aquariums/:aquariumId/members](#get-apiaquariumsaquariumidmembers).

#### Query `GET /api/aquariums/:aquariumId/candidates`

[aquariums.js:410](../backend/routes/aquariums.js#L410) · query

**Tujuan.** Menyiapkan daftar orang yang bisa ditambahkan ke akuarium, untuk pilihan "tambah orang" di halaman Access. Hanya untuk pemilik atau admin.

**Cara kerja.**

* Pertama `findAccessibleAquarium` memastikan akuarium ada dan pengguna minimal pemilik.
* Membaca data akun dari [profiles](#profiles): id, nama, dan email.
* Akun admin dikecualikan (`role <> 'admin'`), karena admin sudah punya akses ke semua akuarium.
* Orang yang sudah menjadi anggota akuarium ini juga dikecualikan, dicek dengan `not exists` ke [aquarium_members](#aquarium_members).
* Diurutkan menurut nama lalu email.

**Hasil.** Daftar `candidates` berisi id pengguna, nama, dan email.

**SQL.**

```sql
select p.id as "userId", p.full_name as "fullName", p.email
from profiles p
where p.role <> 'admin'
  and not exists (select 1 from aquarium_members m where m.aquarium_id = $1 and m.user_id = p.id)
order by p.full_name, p.email
```

`$1` = id akuarium.

Penjelasan kode: [GET /api/aquariums/:aquariumId/candidates](#get-apiaquariumsaquariumidcandidates).

#### Query `PUT /api/aquariums/:aquariumId/members`

[aquariums.js:433](../backend/routes/aquariums.js#L433) · query

**Tujuan.** Menambah anggota atau mengubah perannya di sebuah akuarium. Hanya untuk pemilik atau admin. Ada tiga perintah yang berjalan berurutan, tanpa transaksi.

**Query 1.** Mencari orangnya di tabel [profiles](#profiles) (salah satu dari dua variasi).

**Cara kerja.**

* Bila permintaan membawa id pengguna yang valid, orang dicari lewat id; kalau tidak, dicari lewat email (sudah dirapikan menjadi huruf kecil).
* Yang dibaca hanya id dan peran global (admin atau bukan).
* Bila tidak ditemukan, dijawab "User was not found." Bila ternyata admin, ditolak karena admin sudah punya akses ke semua akuarium.

**SQL.**

```sql
select id, role from profiles where id = $1
select id, role from profiles where email = $1
```

Dua perintah ini adalah dua pilihan: baris pertama dipakai bila pengguna dicari lewat id (`$1` = id pengguna), baris kedua bila dicari lewat email (`$1` = email).

**Query 2.** Memeriksa peran lama orang itu di akuarium ini.

**Cara kerja.**

* Membaca satu kolom `role` dari [aquarium_members](#aquarium_members) untuk pasangan (akuarium, pengguna).
* Hasilnya dipakai untuk aturan keamanan: yang bukan admin tidak boleh memberi peran pemilik, dan tidak boleh mengubah orang yang saat ini pemilik. Bila dilanggar, dijawab dilarang.

**SQL.**

```sql
select role from aquarium_members where aquarium_id = $1 and user_id = $2
```

`$1` = id akuarium, `$2` = id pengguna yang dituju.

**Query 3.** Menyimpan peran.

**Cara kerja.**

* Menambah baris di [aquarium_members](#aquarium_members) berisi id akuarium, id pengguna, dan peran (`owner` atau `member`).
* Bila orang itu sudah menjadi anggota (kunci akuarium dan pengguna sudah ada), barisnya tidak diduplikasi, tetapi perannya diganti dengan peran baru (`excluded.role`).

**SQL.**

```sql
insert into aquarium_members (aquarium_id, user_id, role) values ($1, $2, $3)
on conflict (aquarium_id, user_id) do update set role = excluded.role
```

`$1` = id akuarium, `$2` = id pengguna, `$3` = peran baru.

**Hasil.** Pesan "Member saved." beserta id pengguna dan perannya.

Penjelasan kode: [PUT /api/aquariums/:aquariumId/members](#put-apiaquariumsaquariumidmembers).

#### Query `DELETE /api/aquariums/:aquariumId/members/:userId`

[aquariums.js:464](../backend/routes/aquariums.js#L464) · query

**Tujuan.** Mengeluarkan seseorang dari akuarium. Hanya untuk pemilik atau admin. Ada dua perintah berurutan.

**Query 1.** Memeriksa peran orang itu.

**Cara kerja.**

* Bila id pengguna bukan UUID yang valid, dijawab tidak ditemukan tanpa bertanya ke database.
* Membaca kolom `role` dari [aquarium_members](#aquarium_members) untuk pasangan (akuarium, pengguna).
* Bila tidak ada barisnya, dijawab "This user is not a member of the aquarium." Bila orang itu pemilik dan yang menghapus bukan admin, dijawab dilarang.

**SQL.**

```sql
select role from aquarium_members where aquarium_id = $1 and user_id = $2
```

`$1` = id akuarium, `$2` = id pengguna yang akan dikeluarkan.

**Query 2.** Menghapus keanggotaan.

**Cara kerja.**

* Menghapus satu baris dari [aquarium_members](#aquarium_members) untuk pasangan (akuarium, pengguna). Akun orangnya tidak ikut terhapus, hanya aksesnya ke akuarium ini.

**SQL.**

```sql
delete from aquarium_members where aquarium_id = $1 and user_id = $2
```

`$1` = id akuarium, `$2` = id pengguna.

**Hasil.** Pesan "Member removed."

Penjelasan kode: [DELETE /api/aquariums/:aquariumId/members/:userId](#delete-apiaquariumsaquariumidmembersuserid).

### Query backend/routes/auth.js

[backend/routes/auth.js](../backend/routes/auth.js)

File ini menjalankan perintah database untuk dua langkah setelah pengguna login: memastikan profilnya ada di tabel `profiles` (membuatnya bila belum ada), dan mencatat notifikasi pribadi di tabel `notifications` bila password diganti.

Pembuatan profil dilakukan dalam satu transaksi dengan dua langkah: `insert ... on conflict do nothing` lalu `update ... returning *`. Jika baris profil sudah ada (misalnya dibuat lebih dulu oleh trigger database), langkah pertama diam saja dan tidak menimbulkan error; langkah kedua lalu memperbarui baris yang sama.

#### Query `POST /api/auth/session`

[auth.js:51](../backend/routes/auth.js#L51) · query

**Tujuan.** Dipanggil setelah login agar profil pengguna pasti ada di [profiles](#profiles), lalu mengembalikan profil terbaru ke tampilan. Bila email pengguna ada di daftar `ADMIN_EMAILS`, ia sekaligus dijadikan admin.

**Cara kerja.**

**Query 1.** Memastikan baris profil ada.

* Menambah satu baris ke [profiles](#profiles) berisi id, nama, dan email.
* Bila id itu sudah ada (misalnya trigger [handle_new_user](#handle_new_user) sudah lebih dulu membuatnya), `on conflict (id) do nothing` membuat perintah ini tidak melakukan apa-apa dan tidak error.

**Query 2.** Memperbarui profil dan mengambilnya kembali.

* Memperbarui baris dengan id pengguna. Foto diganti hanya bila foto baru dikirim; `coalesce($2, photo_url)` mempertahankan foto lama bila nilainya kosong.
* Peran menjadi `admin` hanya bila `$3` benar (emailnya ada di daftar admin); selain itu peran dibiarkan.
* Waktu ubah (`updated_at`) hanya diperbarui bila ada foto baru atau pengguna baru saja dijadikan admin.
* `returning *` mengembalikan baris yang sudah diperbarui.

Kedua langkah berjalan dalam satu transaksi, jadi dua-duanya berhasil atau dua-duanya batal.

**Hasil.** Baris profil terbaru dikirim balik ke tampilan, dan ingatan peran lama pengguna dibuang supaya perubahan peran langsung berlaku.

**SQL.**

**Query 1.**

```sql
insert into profiles (id, full_name, email) values ($1, $2, $3) on conflict (id) do nothing
```

**Query 2.**

```sql
update profiles
set photo_url = coalesce($2, photo_url),
    role = case when $3 then 'admin' else role end,
    updated_at = case when $2 is not null or ($3 and role <> 'admin') then now() else updated_at end
where id = $1
returning *
```

Query 1: `$1` = id pengguna, `$2` = nama lengkap (maksimal 120 karakter), `$3` = email. Query 2: `$1` = id pengguna, `$2` = URL foto atau kosong, `$3` = benar bila email ada di daftar `ADMIN_EMAILS`.

Penjelasan kode: [POST /api/auth/session](#post-apiauthsession).

#### Query `POST /api/auth/password-changed`

[auth.js:73](../backend/routes/auth.js#L73) · query

**Tujuan.** Mencatat satu notifikasi pribadi untuk pengguna yang baru saja mengganti password, supaya ia melihat bukti perubahan itu di daftar notifikasinya.

**Cara kerja.**

* Fungsi ini tidak punya SQL sendiri. Ia memanggil `addUserNotification` dengan judul "Password updated" dan isi "Your account password was changed.".
* Perintah dijalankan lewat koneksi biasa, bukan transaksi, karena hanya ada satu langkah penyimpanan.
* Perintah `insert` ke tabel [notifications](#notifications) ada di entri helper `addUserNotification` (lihat [addUserNotification](#addusernotification)).

**Hasil.** Satu baris notifikasi tersimpan, dan tampilan menerima pesan "Password change recorded.".

Penjelasan kode: [POST /api/auth/password-changed](#post-apiauthpassword-changed).

### Query backend/routes/hardware.js

[backend/routes/hardware.js](../backend/routes/hardware.js)

File ini berisi tiga route yang dipanggil oleh alat akuarium (ESP32), bukan oleh pengguna. Alat mengirim data suhu dan status secara rutin, mengirim data tertunda setelah offline, dan meminta pengaturan terbaru. Tabel yang disentuh adalah [aquariums](#aquariums), [device_state](#device_state), [lighting_usage](#lighting_usage), [telemetry_history](#telemetry_history), dan [notifications](#notifications).

Route kiriman telemetri adalah yang paling kompleks di seluruh proyek. Semua langkahnya berjalan dalam satu transaksi, dan baris status alat dikunci (`for update`) di awal supaya dua kiriman yang datang bersamaan dari alat yang sama dijalankan berurutan, bukan saling menimpa. Bila ada langkah yang gagal, semuanya dibatalkan. Beberapa penulisan memakai `on conflict`: bila datanya sudah ada, perintah menjumlahkan atau melewatinya, sehingga kiriman ulang dari alat tidak menggandakan data.

Dua route lainnya lebih sederhana. Route data tertunda hanya menambah riwayat dan melewati catatan yang waktunya sudah ada, tanpa mengubah keadaan alat. Route pengaturan hanya membaca. Frekuensi cek terakhir alat dan penanda perubahan pengaturan disimpan di memori server, bukan di database.

#### Query `POST /api/hardware/:aquariumId/telemetry`

[hardware.js:119](../backend/routes/hardware.js#L119) · query

**Tujuan.** Menerima kiriman data dari alat (suhu dan status heater, lampu, pemberi pakan) dan menyimpannya. Berjalan setiap kali alat mengirim data, biasanya tiap beberapa detik. Selain menyimpan keadaan terbaru, route ini juga mencatat riwayat, pemakaian lampu, dan notifikasi bila ada kejadian penting.

Sebelum transaksi dimulai, kode memeriksa isi kiriman: suhu harus angka antara -10 dan 60 (atau kosong bila alat melaporkan sensor rusak disertai keterangan kejadian), dan status alat harus `ON` atau `OFF` (pemberi pakan `Idle` atau `Active`). Di dalam transaksi ada hingga enam jenis perintah, berurutan sebagai berikut.

**Query 1.** Membaca keadaan terakhir dan mengunci barisnya.

**Cara kerja.**

* Membaca pengaturan suhu dan sistem dari [aquariums](#aquariums) digabung dengan keadaan terakhir alat dari [device_state](#device_state) (suhu terakhir, status heater, lampu, pemberi pakan, waktu kabar terakhir, penanda notifikasi, dan waktu riwayat terakhir), untuk akuarium yang dimaksud.
* Memakai `join` biasa, jadi bila akuarium tidak punya baris keadaan alat, tidak ada yang kembali dan route menjawab tidak ditemukan.
* Dengan `for update of ds`, baris di `device_state` dikunci sampai transaksi selesai. Kiriman lain dari alat yang sama harus menunggu, sehingga perbandingan "keadaan sebelumnya" selalu akurat.
* Dari data ini kode menghitung beberapa hal: apakah suhu baru baru saja melewati batas (sebelumnya masih normal), apakah status alat berubah, apakah sudah sekitar satu menit sejak riwayat terakhir (dengan toleransi 5 detik), dan berapa lama lampu menyala atau mati sejak kabar terakhir.

**SQL.**

```sql
select a.temp_config, a.system_config,
       ds.current_temp, ds.heater_status, ds.led_status, ds.feeder_status, ds.last_updated,
       ds.offline_notified, ds.sensor_error_notified, ds.last_history_at
from aquariums a join device_state ds on ds.aquarium_id = a.id
where a.id = $1
for update of ds
```

`$1` = id akuarium.

**Query 2.** Memperbarui keadaan terakhir alat.

**Cara kerja.**

* Mengubah satu baris di [device_state](#device_state) dengan suhu baru (kosong bila sensor rusak), status heater, lampu, dan pemberi pakan.
* `last_updated` diisi waktu sekarang, sebagai tanda alat masih hidup. Penanda `offline_notified` dikembalikan ke salah (tidak lagi dianggap mati), dan `sensor_error_notified` diisi benar bila sensor sedang rusak, supaya notifikasi sensor rusak tidak dikirim berulang.
* `last_history_at` hanya diisi waktu sekarang bila kiriman ini akan disimpan ke riwayat (`case when`). Kalau tidak, nilainya dibiarkan.

**SQL.**

```sql
update device_state set
    current_temp = $2, heater_status = $3, led_status = $4, feeder_status = $5,
    last_updated = now(), offline_notified = false, sensor_error_notified = $6,
    last_history_at = case when $7 then now() else last_history_at end
where aquarium_id = $1
```

`$1` = id akuarium, `$2` = suhu (kosong bila sensor rusak), `$3` = status heater, `$4` = status lampu, `$5` = status pemberi pakan, `$6` = apakah sensor rusak, `$7` = apakah kiriman ini disimpan ke riwayat.

**Query 3.** Menambah pemakaian lampu hari ini.

Hanya dijalankan bila selang waktu sejak kabar terakhir sah: status lampu sebelumnya dikenal, selangnya lebih dari nol, dan tidak melebihi batas yang menandakan alat sempat mati.

**Cara kerja.**

* Menyimpan jumlah detik ke [lighting_usage](#lighting_usage), yaitu satu baris per akuarium per hari (hari menurut zona waktu akuarium).
* Bila lampu sebelumnya `ON`, detik ditambahkan ke `on_seconds`; bila `OFF`, ke `off_seconds`. Nama kolom dipilih kode dari dua pilihan tetap, bukan dari pengguna.
* Bila baris untuk hari itu belum ada, dibuat baru. Bila sudah ada (`on conflict`), detik yang baru dijumlahkan ke nilai lama (`excluded` adalah nilai yang tadi coba dimasukkan).

**SQL.**

```sql
insert into lighting_usage (aquarium_id, day, ${lightingUsage.column}) values ($1, $2, $3)
on conflict (aquarium_id, day) do update
set ${lightingUsage.column} = lighting_usage.${lightingUsage.column} + excluded.${lightingUsage.column}
-- ${lightingUsage.column} diisi kode: on_seconds bila lampu tadi ON, off_seconds bila OFF
```

`$1` = id akuarium, `$2` = tanggal hari ini menurut zona waktu akuarium, `$3` = jumlah detik yang ditambahkan.

**Query 4.** Membersihkan catatan lampu yang lama (langsung setelah Query 3).

**Cara kerja.**

* Menghapus baris di [lighting_usage](#lighting_usage) milik akuarium ini yang harinya lebih tua dari 6 hari sebelum hari ini. Jadi yang tersisa hari ini dan 6 hari sebelumnya, total 7 hari.
* Angka 7 hari ini cukup untuk menghitung rata-rata jam lampu menyala di tampilan.

**SQL.**

```sql
delete from lighting_usage where aquarium_id = $1 and day < $2::date - $3::int
```

`$1` = id akuarium, `$2` = tanggal hari ini, `$3` = 6 (jumlah hari sebelum hari ini yang masih disimpan).

**Query 5.** Menyimpan riwayat (bila perlu).

Hanya dijalankan bila sensor tidak rusak dan salah satu terjadi: status alat berubah, suhu baru melewati batas, atau sudah sekitar satu menit sejak catatan riwayat terakhir.

**Cara kerja.**

* Menambah satu baris di [telemetry_history](#telemetry_history) berisi suhu, status heater, lampu, pemberi pakan, dan keterangan kejadian (bila alat tidak mengirim keterangan, dipakai "Telemetry update").
* Waktu rekam dipakai dari waktu pengukuran yang dikirim alat bila sah; kalau tidak, waktu server sekarang (`coalesce`).
* Tabel ini punya aturan unik pada pasangan (akuarium, waktu rekam). Bila catatan dengan waktu yang sama sudah ada, perintah dilewati tanpa kesalahan (`do nothing`), sehingga kiriman ulang tidak menjadi duplikat.

**SQL.**

```sql
insert into telemetry_history (aquarium_id, recorded_at, temp, heater_state, led_state, feeder_state, event)
values ($1, coalesce($2, now()), $3, $4, $5, $6, $7)
on conflict (aquarium_id, recorded_at) do nothing
```

`$1` = id akuarium, `$2` = waktu pengukuran dari alat (boleh kosong), `$3` = suhu, `$4` = status heater, `$5` = status lampu, `$6` = status pemberi pakan, `$7` = keterangan kejadian.

**Query 6.** Menyimpan notifikasi dari alat (nol sampai tiga kali), lewat `addAquariumNotification` di `backend/utils/notification-records.js`.

**Cara kerja.**

* Menambah baris di [notifications](#notifications) dengan cakupan akuarium, nama pelaku "Aquarium hardware", dan tanpa id pelaku.
* Notifikasi "Device Restarted" disimpan bila alat melaporkan alasan restart (misalnya watchdog atau brownout), dengan kunci anti-ganda `boot-` diikuti waktu menyala. Jadi laporan restart yang sama yang dikirim ulang tidak membuat notifikasi ganda (`on conflict ... do nothing`).
* Notifikasi "Sensor Error" disimpan saat sensor rusak, tetapi hanya bila sebelumnya belum diberitahukan (penanda `sensor_error_notified`).
* Notifikasi "Temperature Alert" disimpan saat suhu baru saja melewati batas bawah atau atas.
* Notifikasi "Device Back Online" disimpan bila sebelumnya alat dianggap mati (`offline_notified` benar) dan kini mengirim data lagi.

**SQL.**

```sql
insert into notifications (scope, aquarium_id, actor_id, actor_name, title, message, type, dedupe_key)
values ('aquarium', $1, $2, $3, $4, $5, $6, $7)
on conflict (aquarium_id, dedupe_key) where dedupe_key is not null do nothing
```

`$1` = id akuarium, `$2` = id pelaku (kosong), `$3` = "Aquarium hardware", `$4` = judul, `$5` = isi pesan, `$6` = jenis (`alert`, `success`, atau `info`), `$7` = kunci anti-ganda (hanya untuk restart, selebihnya kosong).

**Hasil.** Transaksi mengembalikan frekuensi cek sensor (`pollFrequency`) dari pengaturan sistem. Bila akuarium tidak ditemukan, dijawab tidak ditemukan. Bila berhasil, frekuensi itu dicatat di memori untuk pengawas alat (bukan di database) dan alat menerima jawaban 201 dengan status "received".

Penjelasan kode: [POST /api/hardware/:aquariumId/telemetry](#post-apihardwareaquariumidtelemetry).

#### Query `POST /api/hardware/:aquariumId/telemetry/backlog`

[hardware.js:285](../backend/routes/hardware.js#L285) · query

**Tujuan.** Dipakai alat untuk mengirim data yang tertunda saat sedang offline (misalnya wifi putus), agar riwayat suhu tidak bolong. Hanya riwayat yang ditambah. Keadaan alat dan pemakaian lampu tidak disentuh.

**Cara kerja.**

* Kode memeriksa dulu bahwa daftar `readings` berisi 1 sampai 50 pembacaan. Akuarium dicek lewat `getAquariumById`, fungsi pembantu yang membaca [aquariums](#aquariums) dan [device_state](#device_state) (tanpa kunci), dan bila tidak ada dijawab tidak ditemukan.
* Setiap pembacaan disaring di kode: waktu ukurnya harus sah (tidak lebih dari 7 hari lalu dan tidak di masa depan), suhu antara -10 dan 60, dan status alat harus valid. Yang tidak lolos dilewati.
* Pembacaan yang lolos dimasukkan ke [telemetry_history](#telemetry_history) sekaligus dalam satu perintah. Setiap daftar nilai (waktu, suhu, status heater, lampu, pemberi pakan, keterangan) dikirim sebagai satu larik, lalu `unnest` membuka larik-larik itu menjadi baris-baris berurutan. Id akuarium (`$1`) ditempelkan di setiap baris.
* Bila catatan dengan waktu yang sama sudah ada untuk akuarium ini, baris itu dilewati (`on conflict ... do nothing`), sehingga data yang dikirim ulang tidak menggandakan riwayat.

**Hasil.** Jawaban 201 dengan `accepted` (jumlah pembacaan yang lolos penyaringan) dan `skipped` (jumlah yang ditolak). Jumlah `accepted` termasuk yang kemudian dilewati karena waktunya sudah ada di database.

**SQL.**

```sql
insert into telemetry_history (aquarium_id, recorded_at, temp, heater_state, led_state, feeder_state, event)
select $1, * from unnest($2::timestamptz[], $3::numeric[], $4::text[], $5::text[], $6::text[], $7::text[])
on conflict (aquarium_id, recorded_at) do nothing
```

`$1` = id akuarium, `$2` = larik waktu ukur, `$3` = larik suhu, `$4` = larik status heater, `$5` = larik status lampu, `$6` = larik status pemberi pakan, `$7` = larik keterangan kejadian.

Penjelasan kode: [POST /api/hardware/:aquariumId/telemetry/backlog](#post-apihardwareaquariumidtelemetrybacklog).

#### Query `GET /api/hardware/:aquariumId/config`

[hardware.js:318](../backend/routes/hardware.js#L318) · query

**Tujuan.** Dipakai alat untuk meminta pengaturan terbaru (suhu, lampu, pakan, frekuensi cek, zona waktu). Route ini hanya membaca dan tidak mengubah apa pun di database.

**Cara kerja.**

* Route ini tidak punya perintah SQL sendiri. Bila alat mengirim `wait` dan versi terakhir yang dikenalnya (`v`), kode menunggu di memori (maksimum 25 detik) sampai ada perubahan pengaturan, sehingga alat tidak perlu bertanya terus-menerus.
* Setelah itu nomor versi pengaturan saat ini dicatat dari memori, lalu `getAquariumById` membaca baris akuarium dari [aquariums](#aquariums) digabung dengan [device_state](#device_state) (tanpa kunci), dalam satu perintah yang mirip Query 1 di entri `createConfigPatchHandler`, tetapi tanpa bagian peran pengguna dan tanpa kunci.
* Bila akuarium tidak ada, dijawab tidak ditemukan. Nomor versi diambil sebelum membaca database, supaya perubahan yang terjadi di antaranya tidak terlewat oleh alat pada permintaan berikutnya.

**Hasil.** Objek berisi nomor versi, pengaturan suhu, lampu, dan pakan, serta dari pengaturan sistem hanya frekuensi cek dan zona waktu.

Penjelasan kode: [GET /api/hardware/:aquariumId/config](#get-apihardwareaquariumidconfig).

### Query backend/routes/users.js

[backend/routes/users.js](../backend/routes/users.js)

File ini menjalankan perintah database untuk membaca dan mengubah profil seseorang di tabel `profiles`. Hanya pemilik profil (atau admin untuk membaca) yang boleh memakainya, dan pemeriksaan itu dilakukan di kode sebelum database ditanya.

Pada perubahan profil, baris dikunci dengan `for update` selama transaksi berjalan. Ini menjaga agar dua perubahan yang datang bersamaan tidak saling menimpa. Bila tidak ada nilai yang benar-benar berubah, tidak ada yang ditulis dan tidak ada notifikasi yang dibuat. Bila ada perubahan, notifikasi pribadi disimpan ke tabel `notifications` dalam transaksi yang sama.

#### Query `GET /api/users/:userId`

[users.js:38](../backend/routes/users.js#L38) · query

**Tujuan.** Membaca profil satu orang berdasarkan id-nya. Hanya pemilik profil itu atau admin yang boleh melihat.

**Cara kerja.**

* Izin dan bentuk id diperiksa dulu di kode. Bila id bukan bentuk UUID, langsung dijawab tidak ditemukan tanpa bertanya ke database.
* Baris dibaca dari [profiles](#profiles) dengan filter `id = $1`, semua kolom diambil.
* Paling banyak satu baris kembali, karena id adalah kunci tabel.

**Hasil.** Profil dirapikan (nama, email, peran, foto, waktu dibuat dan diubah) lalu dikirim ke tampilan, atau dijawab tidak ditemukan bila barisnya tidak ada.

**SQL.**

```sql
select * from profiles where id = $1
```

`$1` = id pengguna yang dilihat.

Penjelasan kode: [GET /api/users/:userId](#get-apiusersuserid).

#### Query `PUT /api/users/:userId`

[users.js:68](../backend/routes/users.js#L68) · query

**Tujuan.** Mengubah nama atau foto profil milik pengguna yang sedang login. Hanya hal yang dikirim yang diubah, dan perubahan dicatat sebagai notifikasi pribadi.

**Cara kerja.**

**Query 1.** Membaca dan mengunci profil.

* Dalam satu transaksi, nama dan foto saat ini dibaca dari [profiles](#profiles) dengan `for update`, yaitu baris dikunci sampai transaksi selesai.
* Nilai lama dibandingkan dengan nilai baru. Bila semuanya sama, transaksi selesai tanpa menulis apa pun, dan bila barisnya tidak ada, hasilnya "tidak ditemukan".

**Query 2.** Memperbarui profil.

* Hanya kolom yang dikirim yang diubah (nama, foto, atau keduanya), ditambah waktu ubah (`updated_at = now()`).
* Teks perintah dibentuk dari daftar kolom yang tetap (nama kolom berasal dari kode, bukan dari masukan pengguna), sedangkan nilainya dikirim lewat parameter.

**Query 3.** Menyimpan notifikasi pribadi "Profile updated" ke tabel [notifications](#notifications). Perintahnya ada di helper [addUserNotification](#addusernotification), dijalankan di transaksi yang sama.

**Hasil.** Pemanggil menerima salah satu dari tiga hasil: berubah, tidak berubah, atau profil tidak ada, dan tampilan menampilkan pesan yang sesuai.

**SQL.**

**Query 1.**

```sql
select full_name, photo_url from profiles where id = $1 for update
```

**Query 2.**

```sql
update profiles set ${assignments}, updated_at = now() where id = $1
-- ${assignments} diisi dinamis, misalnya: full_name = $2, photo_url = $3
```

Query 1: `$1` = id pengguna. Query 2: `$1` = id pengguna, `$2` dan seterusnya = nilai baru untuk kolom yang diubah.

Penjelasan kode: [PUT /api/users/:userId](#put-apiusersuserid).

### Query backend/utils/device-watchdog.js

[backend/utils/device-watchdog.js](../backend/utils/device-watchdog.js)

File ini menjalankan pengawas alat yang mendeteksi alat yang berhenti mengirim data. Ia punya dua perintah database: satu yang membaca keadaan terakhir saat server baru menyala, dan satu yang mencatat bahwa sebuah alat offline lalu membuat notifikasinya. Tabel yang terlibat adalah `device_state`, `aquariums`, dan `notifications`.

Pencatatan offline memakai transaksi dengan pengunci baris (`for update of ds`): baris keadaan alat dikunci selama pengecekan sehingga dua proses tidak mengirim notifikasi "Device Offline" ganda. Di dalam transaksi, kondisi dicek ulang (apakah alat benar-benar sudah lewat batas offline dan belum diberi tahu) sebelum menulis apa pun.

Pengecekan dijalankan tiap 30 detik di memori, dan database baru disentuh hanya bila ada alat yang tampak sudah lewat batas offline.

#### Query `loadInitialTelemetryState`

[device-watchdog.js:27](../backend/utils/device-watchdog.js#L27) · query

**Tujuan.** Saat server mulai, membaca kapan tiap akuarium terakhir mengirim data dan apakah notifikasi offline sudah dikirim, supaya pendeteksian alat offline tetap berjalan setelah server dimulai ulang. Dipanggil oleh `startDeviceWatchdog`.

**Cara kerja.**

* Dibaca dari [device_state](#device_state): id akuarium, waktu kabar terakhir, dan penanda notifikasi offline.
* Digabung dengan [aquariums](#aquariums) lewat `join` untuk mengambil pengaturan sistem (misalnya seberapa sering alat melapor).
* Filter `last_updated is not null` hanya mengambil akuarium yang pernah mengirim data.
* Kode lalu mengisi catatan di memori dari baris-baris itu.

**Hasil.** Catatan di memori yang dipakai pengecekan offline berkala. Tidak ada yang diubah di database.

**SQL.**

```sql
select ds.aquarium_id, ds.last_updated, ds.offline_notified, a.system_config
from device_state ds join aquariums a on a.id = ds.aquarium_id
where ds.last_updated is not null
```

Tidak ada parameter.

Penjelasan kode: [loadInitialTelemetryState](#loadinitialtelemetrystate).

#### Query `notifyDeviceOffline`

[device-watchdog.js:44](../backend/utils/device-watchdog.js#L44) · query

**Tujuan.** Memberi tahu bahwa sebuah alat offline. Dipanggil oleh `checkOfflineDevices` tiap 30 detik untuk alat yang kelihatannya sudah terlalu lama diam.

**Cara kerja.**

**Query 1.** Membaca dan mengunci keadaan alat (dalam transaksi).

* Dibaca dari [device_state](#device_state) yang digabung dengan [aquariums](#aquariums): waktu kabar terakhir, penanda sudah diberi tahu, dan pengaturan sistem.
* `for update of ds` mengunci baris keadaan alat sampai transaksi selesai, supaya dua pengecekan tidak mengirim notifikasi ganda.
* Kode mengecek ulang: bila belum pernah ada data, sudah diberi tahu, atau ternyata belum melewati batas offline (misalnya data baru masuk), tidak ada yang ditulis.

**Query 2.** Menandai bahwa alat sudah diberi tahu offline, dengan mengisi `offline_notified = true` di [device_state](#device_state).

**Query 3.** Menyimpan notifikasi "Device Offline" ke [notifications](#notifications) lewat helper [addAquariumNotification](#addaquariumnotification), dalam transaksi yang sama.

**Hasil.** Satu penanda diperbarui dan satu notifikasi tersimpan, atau tidak ada perubahan bila syaratnya ternyata tidak terpenuhi lagi.

**SQL.**

**Query 1.**

```sql
select ds.last_updated, ds.offline_notified, a.system_config
from device_state ds join aquariums a on a.id = ds.aquarium_id
where ds.aquarium_id = $1
for update of ds
```

**Query 2.**

```sql
update device_state set offline_notified = true where aquarium_id = $1
```

Query 1 dan 2: `$1` = id akuarium.

Penjelasan kode: [notifyDeviceOffline](#notifydeviceoffline).

### Query backend/utils/notification-records.js

[backend/utils/notification-records.js](../backend/utils/notification-records.js)

File ini berisi pembantu untuk menyimpan notifikasi ke tabel `notifications`, dan satu potongan syarat yang dipakai ulang oleh route lain untuk memilih notifikasi yang boleh tampil. Pembantu penyimpanan menerima koneksi dari pemanggil, jadi bisa dijalankan di dalam transaksi pemanggil maupun lewat koneksi biasa.

Ada dua jenis notifikasi yang disimpan: untuk seluruh pengguna sebuah akuarium (`scope = 'aquarium'`) dan pribadi untuk satu pengguna (`scope = 'user'`). Notifikasi akuarium punya penanda anti dobel; bila penanda yang sama sudah ada, `on conflict ... do nothing` membuat pesan tidak disimpan ulang dan tidak menimbulkan error.

Potongan `VISIBLE_NOTIFICATION_CONDITION` tidak dijalankan di file ini. Ia hanya teks syarat yang disisipkan route daftar notifikasi bersama `NOTIFICATION_STATE_JOIN`, yang menggabungkan status baca atau hapus per pengguna dari tabel `notification_states`.

#### Query `addAquariumNotification`

[notification-records.js:6](../backend/utils/notification-records.js#L6) · query

**Tujuan.** Menyimpan satu notifikasi untuk seluruh pengguna sebuah akuarium, berisi pelaku, judul, isi, jenis, dan penanda anti dobel. Dipakai oleh [createConfigPatchHandler](#createconfigpatchhandler), [POST /api/aquariums/:aquariumId/feeder/trigger](#post-apiaquariumsaquariumidfeedertrigger), [POST /api/hardware/:aquariumId/telemetry](#post-apihardwareaquariumidtelemetry), dan [notifyDeviceOffline](#notifydeviceoffline).

**Cara kerja.**

* Satu baris ditambah ke [notifications](#notifications) dengan cakupan `aquarium`, id akuarium, pelaku (id dan nama), judul, isi, dan jenis.
* Jenis bawaannya `info`, dan penanda anti dobel (`dedupe_key`) boleh kosong.
* Bila sudah ada notifikasi dengan kombinasi akuarium dan penanda yang sama, `on conflict ... do nothing` membuat perintah ini tidak menyimpan apa-apa dan tidak error.
* Syarat `where dedupe_key is not null` pada bagian conflict berarti aturan anti dobel hanya berlaku bila penanda diisi.

**Hasil.** Satu baris notifikasi baru tersimpan, atau tidak ada perubahan bila penanda yang sama sudah ada. Tidak ada nilai yang dikembalikan.

**SQL.**

```sql
insert into notifications (scope, aquarium_id, actor_id, actor_name, title, message, type, dedupe_key)
values ('aquarium', $1, $2, $3, $4, $5, $6, $7)
on conflict (aquarium_id, dedupe_key) where dedupe_key is not null do nothing
```

`$1` = id akuarium, `$2` = id pelaku (boleh kosong), `$3` = nama pelaku, `$4` = judul, `$5` = isi pesan, `$6` = jenis, `$7` = penanda anti dobel (boleh kosong).

Penjelasan kode: [addAquariumNotification](#addaquariumnotification).

#### Query `addUserNotification`

[notification-records.js:16](../backend/utils/notification-records.js#L16) · query

**Tujuan.** Menyimpan satu notifikasi pribadi, yaitu penerima sekaligus pelakunya adalah pengguna itu sendiri. Dipakai oleh [POST /api/auth/password-changed](#post-apiauthpassword-changed) dan [PUT /api/users/:userId](#put-apiusersuserid).

**Cara kerja.**

* Satu baris ditambah ke [notifications](#notifications) dengan cakupan `user`.
* Id pengguna yang sama (`$1`) dipakai sebagai penerima dan sebagai pelaku.
* Jenis selalu `info`; judul dan isi datang dari pemanggil.
* Tidak ada penanda anti dobel, sehingga tiap pemanggilan menambah satu notifikasi baru.

**Hasil.** Satu baris notifikasi pribadi tersimpan. Tidak ada nilai yang dikembalikan.

**SQL.**

```sql
insert into notifications (scope, recipient_id, actor_id, title, message, type)
values ('user', $1, $1, $2, $3, 'info')
```

`$1` = id pengguna, `$2` = judul, `$3` = isi pesan.

Penjelasan kode: [addUserNotification](#addusernotification).

#### Query `VISIBLE_NOTIFICATION_CONDITION`

[notification-records.js:24](../backend/utils/notification-records.js#L24) · query

**Tujuan.** Potongan syarat yang dipakai ulang (tidak dijalankan di file ini) untuk memilih notifikasi yang boleh tampil bagi seorang pengguna di sebuah akuarium. Dipakai bersama `NOTIFICATION_STATE_JOIN` oleh [GET /api/aquariums/:aquariumId/notifications](#get-apiaquariumsaquariumidnotifications), [PATCH /api/aquariums/:aquariumId/notifications/read-all](#patch-apiaquariumsaquariumidnotificationsread-all), dan [isNotificationVisibleToUser](#isnotificationvisibletouser).

**Cara kerja.**

* Bergantung pada [notifications](#notifications) (alias `n`) dan [notification_states](#notification_states) (alias `s`, status baca atau hapus milik pengguna ini, digabung lewat `left join` di `NOTIFICATION_STATE_JOIN`).
* Notifikasi lolos bila ia milik akuarium tersebut (`scope = 'aquarium'` dan `aquarium_id = $1`), atau notifikasi pribadi pengguna (`scope = 'user'` dan `recipient_id = $2`).
* Notifikasi yang sudah dihapus pengguna (`s.dismissed_at` terisi) dibuang dari hasil. Karena memakai `left join`, notifikasi yang belum pernah dibaca atau dihapus tetap lolos.

**Hasil.** Tidak ada hasil sendiri. Setelah disisipkan ke perintah lain, ia membatasi baris ke notifikasi yang boleh dilihat pengguna.

**SQL.**

```sql
((n.scope = 'aquarium' and n.aquarium_id = $1) or (n.scope = 'user' and n.recipient_id = $2))
and s.dismissed_at is null
```

`$1` = id akuarium, `$2` = id pengguna.

Penjelasan kode: `VISIBLE_NOTIFICATION_CONDITION`.

### Supabase Auth dan Frontend

Tampilan web tidak pernah membuka tabel database secara langsung. Klien Supabase di sana hanya dibuka untuk bagian login (`auth`), jadi hanya bisa dipakai untuk masuk, daftar, mengelola sesi, ganti password, dan keluar. Semua data lain (profil, akuarium, riwayat, notifikasi) diambil lewat backend dengan token login Supabase di header `Authorization: Bearer`. Alat ESP32 juga tidak memegang kredensial database; ia hanya memakai header `x-device-key` ke `/api/hardware/...`.

Cara login bekerja, dalam bahasa sehari-hari: pengguna mengisi email dan password di halaman Login, lalu browser menyerahkannya ke layanan login Supabase. Bila cocok, Supabase memberi sebuah token, semacam tanda pengenal sementara, yang disimpan di browser dan diperbarui otomatis sebelum kedaluwarsa. Setelah itu browser memberi tahu backend bahwa pengguna sudah masuk, dan backend memastikan baris profil orang itu ada di database.

Pada setiap permintaan berikutnya, browser menempelkan token itu di header `Authorization`. Backend memeriksa keaslian token ke Supabase, mengambil id pengguna dari situ, lalu mencari peran umumnya di tabel `profiles`. Untuk menghemat waktu, hasil pemeriksaan token dan pencarian peran diingat sebentar di memori backend, dan ingatan itu dibuang saat peran berubah. Bila token ditolak, tampilan otomatis mengeluarkan pengguna dan meminta login ulang.

Pendaftaran akun mengikuti jalur yang sama: akun dibuat di Supabase Auth, lalu sebuah trigger di database membuat baris profilnya. Ganti password juga dilakukan langsung ke layanan login, dan backend hanya diberi tahu agar mencatat notifikasi. Alat ESP32 memakai jalur yang berbeda sama sekali, yaitu kunci alat yang diubah menjadi sidik digital lalu dicocokkan dengan tabel `devices`.

Entri di bawah ini mencakup fungsi di frontend yang berhubungan dengan login (`backendApi.js` dan `AuthContext.jsx`) dan bagian backend yang memeriksa token serta kunci alat (`middleware/auth.js`).

#### Auth `getAccessToken`

[backendApi.js:7](../frontend/src/api/backendApi.js#L7) · fungsi async

Mengambil token login pengguna yang sedang masuk untuk dikirim ke backend sebagai tanda pengenal.

#### Auth `toAuthError`

[backendApi.js:106](../frontend/src/api/backendApi.js#L106) · fungsi

Mengubah pesan error dari layanan login menjadi pesan yang ramah dibaca pengguna.

#### Auth `syncBackendSession`

[backendApi.js:112](../frontend/src/api/backendApi.js#L112) · fungsi

Meminta backend memastikan profil pengguna ada di database lalu mengembalikannya ke tampilan.

#### Auth `loginWithEmail`

[backendApi.js:115](../frontend/src/api/backendApi.js#L115) · fungsi

Memasukkan pengguna dengan email dan password, lalu menyamakan profilnya dengan backend.

#### Auth `registerAccount`

[backendApi.js:123](../frontend/src/api/backendApi.js#L123) · fungsi

Membuat akun baru dengan nama lengkap lewat layanan login Supabase.

#### Auth `changePassword`

[backendApi.js:136](../frontend/src/api/backendApi.js#L136) · fungsi async

Mengganti password pengguna setelah password lamanya diperiksa, lalu memberi tahu backend agar mencatat notifikasi.

#### Auth `logoutAccount`

[backendApi.js:151](../frontend/src/api/backendApi.js#L151) · fungsi async

Mengeluarkan pengguna dengan menghapus sesi login yang tersimpan di browser.

#### Auth `getUserProfile`

[backendApi.js:156](../frontend/src/api/backendApi.js#L156) · fungsi

Meminta profil seorang pengguna ke backend.

#### Auth `updateUserProfile`

[backendApi.js:159](../frontend/src/api/backendApi.js#L159) · fungsi

Mengirim perubahan nama atau foto profil ke backend.

#### Auth `loadSavedSession`

[AuthContext.jsx:82](../frontend/src/context/AuthContext.jsx#L82) · fungsi async

Memulihkan sesi login saat halaman dibuka atau status login berubah, lalu memuat profil dan daftar akuarium pengguna.

#### Auth `completeSignIn`

[AuthContext.jsx:54](../frontend/src/context/AuthContext.jsx#L54) · fungsi

Merapikan keadaan aplikasi setelah login atau daftar berhasil dengan menyimpan profil dan memuat daftar akuarium.

#### Auth `signOut`

[AuthContext.jsx:69](../frontend/src/context/AuthContext.jsx#L69) · fungsi async

Mengeluarkan pengguna dari aplikasi dan mengosongkan data pengguna di tampilan.

#### Auth `handleUnauthorizedEvent`

[AuthContext.jsx:123](../frontend/src/context/AuthContext.jsx#L123) · handler

Mengeluarkan pengguna dari aplikasi ketika backend menolak token login karena tidak valid atau kedaluwarsa.

#### Auth `hashDeviceKey`

[auth.js:21](../backend/middleware/auth.js#L21) · fungsi

Mengubah kunci alat menjadi sidik digital (SHA-256) yang disimpan dan dicocokkan di database.

### backend/config/aquarium-repository.js

[backend/config/aquarium-repository.js](../backend/config/aquarium-repository.js)

File ini adalah kumpulan alat untuk mengambil data akuarium dari database. Satu daftar kolom bersama (`AQUARIUM_SELECT_COLUMNS`) dipakai agar hasil pencarian selalu seragam: data akuarium itu sendiri digabung dengan kondisi alat dari tabel `device_state`, seperti suhu saat ini, status heater, waktu pembaruan terakhir, dan penanda notifikasi.

Ada dua cara mencari akuarium. `getAquariumById` tidak memeriksa hak akses dan dipakai rute alat yang sudah dicek lewat kunci perangkat, sedangkan `findAccessibleAquarium` dipakai untuk pengguna yang login. Fungsi kedua menentukan peran pengguna: admin global menjadi `admin`, anggota memakai perannya sendiri, dan pengguna yang bukan anggota hanya menjadi `viewer` jika akuarium itu bersifat `monitoring_public`. Tanpa akses atau dengan peran yang kurang dari batas minimum, muncul error 403 dari `forbiddenError`.

Dua fungsi lain menyusun jawaban untuk tampilan. `extractConfigSections` memecah satu baris data menjadi pengaturan suhu, lampu, pemberi pakan, dan sistem, lalu `buildAquariumResponse` merangkainya bersama nama, peran, kondisi saat ini, dan rata-rata jam lampu dari `getLightingAverageHours`. Pada pengaturan sistem hanya `pollFrequency` dan `timezone` yang ditampilkan. File ini dipakai oleh `routes/aquariums.js` dan `routes/hardware.js`.

#### `getAquariumById`

[aquarium-repository.js:12](../backend/config/aquarium-repository.js#L12) · fungsi async

Mengambil satu akuarium beserta kondisi alatnya tanpa memeriksa hak akses pengguna.

#### `findAccessibleAquarium`

[aquarium-repository.js:24](../backend/config/aquarium-repository.js#L24) · fungsi async

Mencari akuarium untuk pengguna yang login sekaligus menentukan perannya dan memastikan ia berhak mengaksesnya.

#### `getLightingAverageHours`

[aquarium-repository.js:51](../backend/config/aquarium-repository.js#L51) · fungsi async

Menghitung rata-rata jam lampu menyala dan mati per hari dari catatan tujuh hari terakhir.

#### `extractConfigSections`

[aquarium-repository.js:64](../backend/config/aquarium-repository.js#L64) · fungsi

Memecah satu baris data akuarium menjadi kelompok pengaturan suhu, lampu, pemberi pakan, dan sistem.

#### `buildAquariumResponse`

[aquarium-repository.js:74](../backend/config/aquarium-repository.js#L74) · fungsi async

Menyusun jawaban lengkap tentang satu akuarium untuk ditampilkan di halaman web.

### backend/config/database.js

[backend/config/database.js](../backend/config/database.js)

File ini menyiapkan sambungan ke database PostgreSQL di Supabase memakai pustaka `pg`. Alamat database wajib ada di pengaturan `DATABASE_URL`; bila kosong, server sengaja gagal menyala dengan pesan yang menunjuk ke `backend/.env.example` agar kesalahan pengaturan cepat ketahuan. Sambungan dikelola sebagai kumpulan (`databasePool`) yang dipakai bergantian dengan jumlah maksimal dari `DB_POOL_MAX` (bawaan 5), memakai SSL kecuali `DATABASE_SSL=false`, dan sambungan yang menganggur ditutup setelah 30 detik.

Selain itu file ini mengatur agar angka desimal (`NUMERIC`) dari database dibaca sebagai angka biasa, bukan teks, sehingga nilai seperti suhu langsung bisa dihitung. Error pada kumpulan sambungan dicatat ke log supaya tidak membuat server berhenti.

Dua alat bantu diekspor untuk dipakai bagian lain: `queryDatabase` untuk satu perintah tunggal dan `runInTransaction` untuk beberapa perintah yang harus berhasil bersama. Hampir semua rute, pengecekan login di `middleware/auth.js`, bagian data akuarium, dan pemantau perangkat memakai kedua alat ini.

#### `pg.types.setTypeParser`

[database.js:11](../backend/config/database.js#L11) · fungsi

Mengatur agar angka desimal dari database dibaca sebagai angka biasa yang langsung bisa dihitung.

#### `queryDatabase`

[database.js:24](../backend/config/database.js#L24) · fungsi

Menjalankan satu perintah ke database dan mengambil hasilnya.

#### `runInTransaction`

[database.js:27](../backend/config/database.js#L27) · fungsi async

Menjalankan beberapa perintah database sebagai satu paket yang semuanya berhasil atau semuanya dibatalkan.

### backend/supabase/config.toml

[backend/supabase/config.toml](../backend/supabase/config.toml)

Berkas ini berisi pengaturan Supabase CLI untuk proyek Smart Aquarium, yaitu nama proyek `smart-aquarium` dan pengaturan layanan yang dijalankan di komputer lokal. Pengaturannya dipakai oleh perintah `npx supabase ...` dari folder `backend/`, misalnya `supabase start` (menyalakan database lokal lewat Docker), `supabase link`, dan `supabase db push`, serta oleh integrasi GitHub Supabase yang membaca folder `supabase/` di repo ini.

Layanan data bawaan Supabase (Data API) dimatikan karena data hanya diakses server backend lewat sambungan database langsung, sedangkan layanan login tetap aktif. Database lokal memakai port 54322 dengan PostgreSQL versi 17 (disamakan dengan versi di dashboard Supabase), migrasi dijalankan otomatis, dan Studio (alat kelola database) aktif di port 54323.

Layanan login lokal diarahkan ke situs dashboard `http://localhost:5173` dengan pendaftaran terbuka dan tanpa konfirmasi email supaya pengembang bisa langsung masuk. Ini hanya berlaku untuk lokal; pengaturan login proyek di cloud diatur lewat dashboard Supabase.

### backend/supabase/migrations/20261028000000_init.sql

[backend/supabase/migrations/20261028000000_init.sql](../backend/supabase/migrations/20261028000000_init.sql)

Berkas migrasi ini membuat struktur database awal Smart Aquarium dari nol. Isinya sembilan tabel: `profiles` (data akun), `aquariums` (akuarium dan pengaturannya), `aquarium_members` (siapa boleh mengelola akuarium mana), `devices` (alat ESP32), `device_state` (kondisi terkini), `telemetry_history` (riwayat pembacaan), `lighting_usage` (pemakaian lampu per hari), `notifications`, dan `notification_states`. Ada juga dua trigger otomatis: satu membuat profil setiap ada akun baru, satu lagi membuat baris kondisi kosong setiap ada akuarium baru, serta beberapa indeks pencari supaya data cepat ditemukan.

Prinsip keamanannya, seperti ditulis di komentar berkas, adalah database hanya diakses oleh server backend lewat sambungan langsung. Browser dan alat ESP32 tidak boleh menyentuhnya, padahal Supabase biasanya membuka schema `public` lewat layanan data bawaannya. Karena itu hak pengguna luar dicabut berlapis: hak bawaan untuk objek baru dicabut di awal berkas, pengaman tingkat baris (RLS) dinyalakan pada semua tabel tanpa aturan izin, dan hak pada semua objek yang sudah ada dicabut di akhir berkas. Server backend tidak terpengaruh karena tersambung sebagai pemilik tabel.

Beberapa aturan data juga dijaga langsung oleh database, misalnya kode akuarium hanya boleh huruf, angka, garis bawah, dan strip sepanjang 1 sampai 64 karakter, suhu riwayat harus berada di antara -10 dan 60, dan pembacaan pada waktu yang sama tidak bisa tersimpan dua kali sehingga data kiriman ulang dari alat tidak menjadi duplikat. Kunci alat tidak disimpan asli, hanya sidik digitalnya (hash SHA-256).

Berkas ini dijalankan lewat Supabase CLI (`supabase db push`) atau integrasi GitHub Supabase, dan hasil penguncian aksesnya diuji oleh `tests/lockdown.test.js`. Migrasi berikutnya, yaitu `viewer_monitoring` dan `one_device_per_aquarium`, menambah perubahan di atas struktur ini.

#### `alter default privileges`

[20261028000000_init.sql:10](../backend/supabase/migrations/20261028000000_init.sql#L10) · policy

Mencabut izin bawaan pengguna luar pada tabel, urutan nomor, dan fungsi yang dibuat di kemudian hari agar otomatis tertutup.

#### `profiles`

[20261028000000_init.sql:19](../backend/supabase/migrations/20261028000000_init.sql#L19) · tabel

Menyimpan data profil satu akun, yaitu nama lengkap, email, foto, dan peran global admin atau user.

#### `handle_new_user`

[20261028000000_init.sql:29](../backend/supabase/migrations/20261028000000_init.sql#L29) · trigger

Fungsi otomatis yang membuatkan profil setiap kali ada akun baru.

#### `on_auth_user_created`

[20261028000000_init.sql:46](../backend/supabase/migrations/20261028000000_init.sql#L46) · trigger

Pemicu yang menjalankan pembuatan profil otomatis setiap kali akun baru dibuat di sistem login.

#### `aquariums`

[20261028000000_init.sql:53](../backend/supabase/migrations/20261028000000_init.sql#L53) · tabel

Menyimpan data setiap akuarium beserta empat kelompok pengaturannya dan waktu terakhir pemberian pakan manual.

#### `aquarium_members`

[20261028000000_init.sql:68](../backend/supabase/migrations/20261028000000_init.sql#L68) · tabel

Mencatat siapa saja yang boleh mengelola tiap akuarium dan sebagai apa, yaitu pemilik atau anggota.

#### `devices`

[20261028000000_init.sql:78](../backend/supabase/migrations/20261028000000_init.sql#L78) · tabel

Menyimpan alat ESP32 yang terpasang di akuarium beserta sidik digital kuncinya.

#### `device_state`

[20261028000000_init.sql:91](../backend/supabase/migrations/20261028000000_init.sql#L91) · tabel

Menyimpan kondisi terkini tiap akuarium, yaitu suhu, status heater, lampu, pemberi pakan, dan waktu laporan terakhir.

#### `create_device_state`

[20261028000000_init.sql:104](../backend/supabase/migrations/20261028000000_init.sql#L104) · trigger

Fungsi otomatis yang membuatkan baris kondisi kosong setiap kali ada akuarium baru.

#### `on_aquarium_created`

[20261028000000_init.sql:113](../backend/supabase/migrations/20261028000000_init.sql#L113) · trigger

Pemicu yang menjalankan pembuatan baris kondisi otomatis setiap kali akuarium baru ditambahkan.

#### `telemetry_history`

[20261028000000_init.sql:119](../backend/supabase/migrations/20261028000000_init.sql#L119) · tabel

Menyimpan riwayat suhu dan status alat dari waktu ke waktu tanpa catatan ganda pada waktu yang sama.

#### `lighting_usage`

[20261028000000_init.sql:133](../backend/supabase/migrations/20261028000000_init.sql#L133) · tabel

Mencatat berapa detik lampu menyala dan mati pada setiap hari untuk tiap akuarium.

#### `notifications`

[20261028000000_init.sql:145](../backend/supabase/migrations/20261028000000_init.sql#L145) · tabel

Menyimpan pesan pemberitahuan untuk semua anggota satu akuarium maupun untuk satu pengguna saja.

#### `notification_states`

[20261028000000_init.sql:167](../backend/supabase/migrations/20261028000000_init.sql#L167) · tabel

Mencatat per pengguna kapan sebuah notifikasi dibaca dan kapan disembunyikan.

#### `enable row level security`

[20261028000000_init.sql:178](../backend/supabase/migrations/20261028000000_init.sql#L178) · policy

Menyalakan pengaman tingkat baris pada semua tabel tanpa aturan izin sehingga pengguna luar tidak bisa membuka data apa pun.

#### `revoke all`

[20261028000000_init.sql:188](../backend/supabase/migrations/20261028000000_init.sql#L188) · policy

Mencabut semua izin pengguna luar pada tabel, urutan nomor, dan fungsi yang sudah ada.

### backend/supabase/migrations/20261028040017_viewer_monitoring.sql

[backend/supabase/migrations/20261028040017_viewer_monitoring.sql](../backend/supabase/migrations/20261028040017_viewer_monitoring.sql)

Berkas migrasi ini menambah satu kolom `monitoring_public` pada tabel `aquariums` untuk mendukung peran penonton (`viewer`). Pengguna yang belum punya peran apa pun, yaitu bukan admin dan bukan pemilik atau anggota di akuarium mana pun, boleh melihat pemantauan akuarium yang ditandai publik tanpa bisa mengubah apa pun. Nilai bawaannya benar (publik) supaya pengguna baru langsung bisa melihat pemantauan.

Admin dapat mematikan pemantauan publik per akuarium lewat `PATCH /api/admin/aquariums/:aquariumId`. Kolom ini dibaca oleh `findAccessibleAquarium` dan oleh layanan daftar akuarium di `routes/aquariums.js` untuk menentukan siapa yang mendapat peran penonton.

#### `monitoring_public`

[20261028040017_viewer_monitoring.sql:5](../backend/supabase/migrations/20261028040017_viewer_monitoring.sql#L5) · tabel

Menambah penanda di tabel akuarium yang menentukan apakah pemantauannya boleh dilihat publik sebagai penonton.

### backend/supabase/migrations/20261028041718_one_device_per_aquarium.sql

[backend/supabase/migrations/20261028041718_one_device_per_aquarium.sql](../backend/supabase/migrations/20261028041718_one_device_per_aquarium.sql)

Berkas migrasi ini membatasi satu akuarium hanya boleh punya satu alat ESP32. Aturannya dibuat sebagai batasan unik pada kolom `aquarium_id` di tabel `devices`, sehingga dijaga langsung oleh database walaupun ada dua permintaan pendaftaran alat yang masuk bersamaan.

Jika sudah ada akuarium dengan lebih dari satu alat, migrasi berhenti dengan pesan kesalahan indeks unik, dan alat yang berlebih harus dicabut dari halaman Access sebelum migrasi dijalankan ulang. Migrasi ini juga menghapus indeks pencari lama yang kini mubazir karena batasan unik otomatis membuat indeks yang sama. Aturan ini berkaitan dengan `POST /api/admin/aquariums/:aquariumId/devices` yang mendaftarkan alat baru.

#### `devices_one_per_aquarium`

[20261028041718_one_device_per_aquarium.sql:6](../backend/supabase/migrations/20261028041718_one_device_per_aquarium.sql#L6) · tabel

Aturan yang melarang satu akuarium punya lebih dari satu alat, bahkan jika dua pendaftaran masuk bersamaan.

#### `devices_aquarium_id_idx`

[20261028041718_one_device_per_aquarium.sql:9](../backend/supabase/migrations/20261028041718_one_device_per_aquarium.sql#L9) · tabel

Menghapus indeks pencari lama karena sudah digantikan oleh indeks dari aturan satu alat per akuarium.
