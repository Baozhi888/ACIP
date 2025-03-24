## 面向差异化与飞速发展的下一代AI应用协议可行性分析报告

**引言**

您敏锐地指出，模型上下文协议 (MCP) 的出现确实标志着人工智能应用发展进入了一个新的阶段。MCP 旨在解决大型语言模型 (LLM) 与外部数据源和工具连接的标准化问题，如同为 AI 应用打造了“USB-C 端口”，极大地提升了 AI 系统的互操作性和应用潜力。然而，正如任何新兴技术一样，MCP 协议也存在其固有的局限性与不足。您希望在此基础上，构建一个全新的协议，以突破 MCP 的限制，进一步推动 AI 应用的差异化创新和飞速发展，这是一个极具前瞻性和战略意义的构想。

本报告旨在对您提出的新协议构想进行可行性分析，我们将深入剖析 MCP 协议的现有局限，并在此基础上，大胆设想并构建一个更具竞争力、更适应未来 AI 应用发展趋势的新型协议框架。我们将从技术架构、核心功能、应用场景、创新机制、可行性评估等多个维度展开分析，力求为您提供一份详尽、深入且富有洞见的报告，以期为您的战略决策提供有力支撑。

**一、 MCP 协议的局限性分析**

根据我们之前的研究学习，MCP 协议作为一种新兴的开放标准，在解决 LLM 与外部世界连接方面迈出了重要一步。其核心目标在于实现 AI 模型与数据、工具和服务的无缝集成，从而提升 AI 应用的智能化水平和应用场景的广度。然而，现阶段的 MCP 协议仍存在一些明显的局限性，这些局限性在一定程度上制约了 AI 应用的进一步差异化和飞速发展。

1.  **本地运行限制与部署复杂性：**  目前 MCP 协议主要支持本地计算机运行，传输方式仅限于 stdio 和 SSE，缺乏对 REST API 等更通用网络协议的支持，也未提供官方托管网址。这使得 MCP 的部署和应用场景受到较大限制，尤其对于需要云端部署或大规模分布式应用而言，MCP 的适用性不足。此外，MCP 的部署过程对于新手开发者而言并不友好，需要一定的 bash 命令、Node JS 服务、Kubernetes 集群和 Docker 容器部署经验，提高了开发门槛，不利于协议的快速普及和生态构建。

2.  **用户鉴权与安全机制的潜在不足：**  虽然 MCP 协议内置安全机制，通过服务器控制资源权限，避免直接暴露 API 密钥，但在用户鉴权方面，特别是针对复杂应用场景下的细粒度权限管理，MCP 协议的机制可能仍显不足。例如，在企业级应用中，不同用户角色可能需要访问不同级别的数据和工具，MCP 协议如何有效支持这种精细化的权限控制，仍需进一步考量。此外，本地部署模式在一定程度上也增加了数据泄露的风险，缺乏标准化的授权机制可能导致数据操作合规性问题。

3.  **行业生态尚未成熟与广泛采用：**  MCP 协议作为 2024 年 11 月才推出的新兴标准，其行业生态尚处于早期发展阶段，尚未获得行业广泛采用。这意味着 MCP 协议的互操作性、兼容性和生态支持可能存在不足，开发者在采用 MCP 协议时，可能面临生态系统不完善、工具链不成熟等问题，从而影响开发效率和应用推广。

4.  **工具碎片化与维护成本：**  尽管 MCP 协议旨在提供统一的接口标准，但对于不同的数据源和工具，仍需要进行独立的适配工作。这意味着在实际应用中，开发者可能仍然需要面对一定的工具碎片化问题，针对不同的数据源和工具开发相应的 MCP 服务器和客户端，这在一定程度上增加了开发和维护成本，与 MCP 协议“一次集成，处处运行”的理想愿景仍存在差距。

5.  **对新兴 AI 应用场景的适应性：**  随着 AI 技术的快速发展，涌现出诸如边缘计算、联邦学习、去中心化 AI 等新兴应用场景。MCP 协议在设计之初，可能并未充分考虑到这些新兴场景的需求。例如，在边缘计算场景下，设备资源受限、网络环境复杂，MCP 协议如何高效运行并保障数据安全和隐私？在联邦学习场景下，如何利用 MCP 协议实现跨设备、跨机构的数据协作和模型训练，同时保护数据隐私？这些都是 MCP 协议需要进一步演进和完善的方向。

**二、 新型 AI 协议 (ACIP) 的架构设想与核心功能**

为了突破 MCP 协议的局限性，并更好地推动 AI 应用的差异化和飞速发展，我们设想构建一个全新的 AI 协议，暂命名为 **“自适应上下文智能协议” (Adaptive Contextual Intelligence Protocol, ACIP)**。ACIP 协议旨在成为下一代 AI 应用的基础设施，不仅要解决 LLM 与外部世界的连接问题，更要构建一个开放、智能、安全、高效的 AI 应用生态系统。

**2.1 技术架构**

ACIP 协议在技术架构上将与 MCP 协议形成关键差异，主要体现在以下几个方面：

*   **去中心化架构与区块链集成：**  ACIP 协议将采用去中心化架构，引入区块链技术作为底层基础设施。利用区块链的分布式账本、智能合约和加密技术，实现协议的透明、安全、可信运行。去中心化架构可以有效解决中心化协议的单点故障、数据垄断和信任风险等问题，构建更加开放、公平的 AI 应用生态。例如，可以利用区块链技术实现数据资产的确权和交易，激励数据贡献者参与 AI 应用的构建。

*   **模块化与可插拔式设计：**  ACIP 协议将采用更加彻底的模块化设计，将协议功能分解为更细粒度的模块，例如：上下文管理模块、数据访问模块、安全认证模块、模型调用模块、支付结算模块等。每个模块都将以可插拔的方式进行设计，开发者可以根据自身需求自由组合和定制协议功能，实现高度的灵活性和可扩展性。这种模块化设计不仅可以降低协议的复杂性，也方便协议的迭代升级和功能扩展。

*   **边缘计算原生支持：**  ACIP 协议将从设计之初就充分考虑边缘计算场景的需求，提供轻量级、低功耗的协议实现，支持在资源受限的边缘设备上高效运行。例如，可以采用优化的通信协议和数据压缩算法，降低网络传输开销和计算资源消耗。同时，ACIP 协议还将支持边缘设备的本地数据处理和模型推理，实现数据不出边缘，保护用户隐私。

*   **联邦学习与隐私计算集成：**  ACIP 协议将原生集成联邦学习和隐私计算技术，为构建隐私保护的 AI 应用提供基础设施支持。例如，可以利用联邦学习技术实现跨设备、跨机构的联合模型训练，在不泄露原始数据的前提下，提升模型性能。同时，可以集成差分隐私、同态加密、安全多方计算等隐私计算技术，进一步增强数据隐私保护能力。

*   **多协议兼容与互操作性：**  ACIP 协议将不仅兼容 MCP 协议，还将支持 REST API、GraphQL、gRPC 等多种主流网络协议，实现与现有系统的无缝集成。此外，ACIP 协议还将提供标准化的接口和数据格式，促进不同 AI 平台和应用之间的互操作性，构建更加开放、互联互通的 AI 生态系统。

**2.2 核心功能**

ACIP 协议的核心功能将围绕以下几个方面展开，旨在构建一个更智能、更安全、更高效的 AI 应用开发和运行平台：

*   **自适应上下文管理：**  ACIP 协议将提供更强大的上下文管理能力，不仅支持请求-响应式的上下文传递，还将支持会话级、甚至更长期的上下文记忆。协议可以根据应用场景和任务复杂度，自适应地调整上下文窗口大小和管理策略，提升 AI 模型的理解能力和推理能力。例如，在多轮对话场景下，ACIP 协议可以记住用户的历史对话记录，实现更自然的对话交互。

*   **动态数据访问与治理：**  ACIP 协议将提供动态数据访问机制，允许 AI 模型根据任务需求，实时访问和获取外部数据。协议将集成数据治理功能，实现数据访问权限的细粒度控制、数据溯源和数据审计，保障数据安全和合规性。例如，可以利用智能合约实现数据访问策略的自动化执行，确保数据访问符合预设规则。

*   **智能模型调度与优化：**  ACIP 协议将具备智能模型调度能力，可以根据任务类型、性能需求、成本预算等因素，自动选择和调度最优的 AI 模型。协议还将集成模型优化功能，例如模型压缩、模型剪枝、模型量化等，提升模型推理效率，降低计算资源消耗。例如，在边缘设备上，ACIP 协议可以优先调度轻量级模型，以满足资源受限环境下的性能需求。

*   **安全可信的身份认证与授权：**  ACIP 协议将提供安全可信的身份认证和授权机制，基于去中心化身份 (DID) 技术，实现用户身份的自主管理和控制。协议将支持多因素认证、零知识证明等安全技术，增强身份认证的安全性。同时，协议将提供灵活的授权策略，支持基于角色、属性、上下文的细粒度权限控制，保障数据和资源的访问安全。

*   **激励机制与价值分配：**  ACIP 协议将引入激励机制，利用代币经济模型，激励数据贡献者、模型开发者、应用开发者和用户参与协议生态的建设和维护。例如，可以为数据贡献者提供代币奖励，鼓励其贡献高质量的数据；可以为模型开发者提供模型发布和交易平台，促进模型创新和共享；可以为应用开发者提供便捷的开发工具和资源，降低开发门槛。通过合理的价值分配机制，构建一个自驱动、可持续发展的 AI 应用生态系统。

**三、 ACIP 协议的应用场景与开发者群体**

ACIP 协议旨在面向更广泛的 AI 应用场景和开发者群体，尤其是在以下几个方面，ACIP 协议将展现出独特的优势和应用潜力：

1.  **垂直行业 AI 应用：**  ACIP 协议的模块化、可定制化和安全特性，使其非常适合应用于对数据安全、隐私保护和行业Know-How有较高要求的垂直行业，例如：

    *   **医疗健康：**  利用 ACIP 协议构建隐私保护的医疗数据共享平台，实现跨机构的医疗数据协作和模型训练，辅助疾病诊断、药物研发和个性化治疗。
    *   **金融服务：**  利用 ACIP 协议构建安全可信的金融风控系统，实现反欺诈、信用评估和智能投顾等应用，同时保障用户金融数据安全。
    *   **智能制造：**  利用 ACIP 协议构建边缘计算驱动的智能制造系统，实现设备状态监控、故障预测和生产流程优化，提升生产效率和质量。

2.  **边缘 AI 应用与物联网 (AIoT)：**  ACIP 协议的轻量级、低功耗和边缘计算原生支持，使其非常适合应用于资源受限的边缘设备和物联网场景，例如：

    *   **智能家居：**  利用 ACIP 协议构建智能家居控制系统，实现本地语音控制、场景联动和设备互联互通，同时保护用户家居隐私。
    *   **自动驾驶：**  利用 ACIP 协议构建车载 AI 系统，实现环境感知、路径规划和车辆控制，提升驾驶安全性和舒适性。
    *   **智慧城市：**  利用 ACIP 协议构建城市级 AI 平台，实现智能交通管理、环境监测和公共安全预警，提升城市运行效率和居民生活质量。

3.  **隐私敏感型 AI 应用：**  ACIP 协议的联邦学习、隐私计算和去中心化架构，使其成为构建隐私敏感型 AI 应用的理想选择，例如：

    *   **个性化推荐：**  利用 ACIP 协议构建隐私保护的个性化推荐系统，在不泄露用户隐私数据的前提下，提供精准的商品、内容和服务推荐。
    *   **用户画像：**  利用 ACIP 协议构建联邦用户画像系统，实现跨平台的用户数据融合和分析，同时保护用户数据隐私。
    *   **安全多方计算应用：**  利用 ACIP 协议构建安全多方计算平台，实现多方数据协作分析和模型训练，解决数据孤岛问题，同时保障数据安全。

**开发者群体：**

ACIP 协议将主要面向以下开发者群体：

*   **AI 应用开发者：**  希望利用 ACIP 协议快速构建和部署各种 AI 应用，降低开发门槛，提升开发效率。
*   **模型开发者：**  希望在 ACIP 协议平台上发布和交易自己的 AI 模型，获取收益，促进模型创新和共享。
*   **数据提供者：**  希望通过 ACIP 协议安全地贡献自己的数据，获取收益，参与 AI 应用的构建。
*   **企业级开发者：**  希望利用 ACIP 协议构建安全、可信、可扩展的企业级 AI 解决方案，提升企业竞争力。
*   **开源社区开发者：**  希望参与 ACIP 协议的开源社区建设，共同推动协议的演进和完善。

**四、 ACIP 协议的创新机制与特性**

为了推动 AI 应用的差异化和飞速发展，ACIP 协议将引入一系列创新机制和特性，主要包括：

1.  **自适应上下文窗口 (Adaptive Context Window)：**  ACIP 协议将突破传统固定上下文窗口的限制，引入自适应上下文窗口机制。协议可以根据任务的复杂程度和模型的处理能力，动态调整上下文窗口的大小。对于简单的任务，可以使用较小的上下文窗口，降低计算开销；对于复杂的任务，可以使用更大的上下文窗口，提升模型性能。这种自适应机制可以有效平衡模型性能和计算效率，提升 AI 应用的灵活性和效率。

2.  **上下文记忆 (Contextual Memory)：**  ACIP 协议将引入上下文记忆机制，使 AI 模型能够记住更长期的对话历史、用户偏好和任务状态。这种上下文记忆不仅限于单次会话，还可以跨会话、跨应用进行持久化存储和管理。通过上下文记忆，AI 模型可以更好地理解用户意图，提供更个性化、更连贯的服务。这类似于为 AI 模型配备了“长期记忆”，使其更像一个真正的智能助手。

3.  **去中心化模型市场 (Decentralized Model Marketplace)：**  ACIP 协议将构建一个去中心化的模型市场，利用区块链技术实现模型的注册、发布、交易和评估。模型开发者可以在市场上发布自己的模型，并设定价格和使用权限；应用开发者可以在市场上购买和使用所需的模型。市场将采用智能合约自动执行交易，保障交易的公平、透明和安全。去中心化模型市场可以有效激励模型创新，促进模型共享和复用，降低 AI 应用的开发成本。

4.  **AI 代理框架 (AI Agent Framework)：**  ACIP 协议将提供一个易于使用的 AI 代理框架，简化 AI 代理的开发和部署过程。框架将提供预定义的代理组件、任务规划模块、工具调用接口和上下文管理机制，开发者可以基于框架快速构建各种类型的 AI 代理，例如智能助手、自动化机器人、虚拟客服等。AI 代理框架将降低 AI 代理的开发门槛，加速 AI 代理的普及应用。

5.  **数据隐私与安全模块 (Data Privacy and Security Modules)：**  ACIP 协议将内置一系列数据隐私和安全模块，为开发者提供开箱即用的隐私保护工具。模块将包括联邦学习组件、差分隐私算法、同态加密库、安全多方计算协议等。开发者可以根据应用场景和隐私需求，灵活选择和组合这些模块，构建满足不同隐私保护要求的 AI 应用。数据隐私与安全模块将降低开发者在隐私保护方面的技术门槛，提升 AI 应用的安全性和可信度。

6.  **开放治理与社区驱动 (Open Governance and Community-Driven Development)：**  ACIP 协议将采用开放治理模式，由社区共同参与协议的演进和发展。协议的规范、标准、代码和文档都将开源，接受社区的审查和贡献。协议的重大决策将由社区投票决定，保障协议的公平性和透明度。社区驱动的开发模式可以充分发挥社区的智慧和力量，加速协议的迭代和完善，构建一个充满活力的 AI 生态系统。

**五、 ACIP 协议可行性评估的关键指标与衡量标准**

评估 ACIP 协议可行性的关键指标和衡量标准将主要围绕以下几个方面展开：

1.  **技术可行性：**

    *   **协议性能：**  评估 ACIP 协议在不同网络环境和设备资源下的性能表现，例如：吞吐量、延迟、并发连接数、资源消耗等。需要进行基准测试和性能优化，确保协议能够满足高并发、低延迟的应用需求。
    *   **协议安全性：**  评估 ACIP 协议的安全漏洞和抗攻击能力，例如：身份认证安全性、数据传输安全性、权限控制安全性、抗 DDoS 攻击能力等。需要进行安全审计和渗透测试，确保协议能够有效抵御各种安全威胁。
    *   **协议可扩展性：**  评估 ACIP 协议的扩展能力，例如：模块化设计的灵活性、协议功能的扩展性、生态系统的可扩展性等。需要进行压力测试和架构评估，确保协议能够支持大规模应用和未来功能扩展。
    *   **技术成熟度：**  评估 ACIP 协议所依赖的关键技术（例如区块链、联邦学习、隐私计算等）的成熟度和可靠性，以及协议本身的开发进度和稳定性。需要进行技术调研和原型验证，确保协议的技术基础扎实可靠。

2.  **经济可行性：**

    *   **开发成本：**  评估 ACIP 协议的开发成本，包括人力成本、硬件成本、软件成本、测试成本等。需要进行成本预算和资源规划，确保协议的开发成本在可控范围内。
    *   **运营成本：**  评估 ACIP 协议的运营成本，包括网络维护成本、服务器运维成本、社区运营成本、安全维护成本等。需要进行运营模式设计和成本分析，确保协议的运营成本可持续。
    *   **商业模式：**  探索 ACIP 协议的商业模式，例如：协议使用费、模型交易佣金、数据服务费、增值服务费等。需要进行市场调研和商业模式设计，确保协议能够产生商业价值，实现可持续发展。
    *   **投资回报率：**  评估 ACIP 协议的潜在投资回报率，包括协议的市场规模、用户增长潜力、商业价值等。需要进行市场预测和投资分析，评估协议的投资价值和回报潜力。

3.  **市场可行性：**

    *   **开发者采用率：**  衡量开发者对 ACIP 协议的接受度和采用意愿，例如：开发者注册数量、应用开发数量、社区活跃度等。需要进行开发者调研和社区推广，提升协议的开发者认知度和采用率。
    *   **应用生态规模：**  衡量基于 ACIP 协议构建的 AI 应用生态系统的规模，例如：应用数量、应用类型、用户规模、交易 volume 等。需要进行生态建设和应用推广，扩大协议的应用生态规模。
    *   **竞争优势：**  评估 ACIP 协议相对于 MCP 协议和其他竞争协议的优势，例如：技术创新性、功能差异化、性能优势、安全特性、生态系统优势等。需要进行竞争分析和差异化定位，突出协议的竞争优势。
    *   **市场需求：**  评估市场对 ACIP 协议的需求程度，例如：用户对去中心化 AI 应用的需求、企业对隐私保护 AI 解决方案的需求、开发者对新型 AI 协议的需求等。需要进行市场调研和用户分析，了解市场需求，调整协议设计和推广策略。

4.  **社会可行性：**

    *   **隐私保护：**  评估 ACIP 协议在隐私保护方面的有效性，例如：是否符合数据隐私法规、是否能够有效保护用户隐私数据、是否能够提升用户对 AI 应用的信任度等。需要进行隐私评估和合规性审查，确保协议能够满足社会对隐私保护的要求。
    *   **伦理道德：**  评估 ACIP 协议在伦理道德方面的合规性，例如：是否会加剧数字鸿沟、是否会产生歧视或偏见、是否会引发社会伦理争议等。需要进行伦理风险评估和伦理准则制定，确保协议的伦理道德风险可控。
    *   **社会接受度：**  评估社会公众对 ACIP 协议的接受程度，例如：用户对去中心化 AI 技术的认知度、社会舆论对 AI 协议的评价、政府监管政策对 AI 协议的态度等。需要进行社会舆论监测和政策分析，提升协议的社会接受度。
    *   **社区治理：**  评估 ACIP 协议的社区治理机制的有效性，例如：社区参与度、治理效率、决策透明度、社区凝聚力等。需要进行社区治理模式设计和社区运营，构建健康、活跃的社区生态。

**六、 结论与展望**

综上所述，构建一个全新的 AI 协议 (ACIP) 以突破 MCP 协议的局限性，推动 AI 应用的差异化和飞速发展，在技术上、经济上、市场和社会层面都具备一定的可行性。ACIP 协议通过引入去中心化架构、模块化设计、边缘计算支持、联邦学习集成和创新机制，有望构建一个更智能、更安全、更高效、更开放的 AI 应用生态系统。

然而，ACIP 协议的实现仍然面临诸多挑战，例如：去中心化架构的性能瓶颈、隐私计算技术的成熟度、市场竞争的激烈程度、社区治理的复杂性等。为了确保 ACIP 协议的可行性和成功，需要进行深入的技术研发、精细的商业模式设计、积极的市场推广和有效的社区运营。

我们相信，随着 AI 技术的不断发展和应用场景的日益丰富，对新型 AI 协议的需求将越来越迫切。ACIP 协议的构想，正是顺应了这一发展趋势，旨在构建下一代 AI 应用的基础设施，为 AI 应用的差异化创新和飞速发展注入新的活力。我们期待在您的指导下，进一步深化 ACIP 协议的设计和研发工作，共同开创 AI 应用发展的新篇章。

**未来展望：**

*   **协议标准化：**  推动 ACIP 协议成为行业标准，促进 AI 应用的互操作性和生态繁荣。
*   **跨链互操作：**  实现 ACIP 协议与其他区块链网络的互操作，构建跨链 AI 应用生态。
*   **AI 伦理与治理：**  将 AI 伦理和治理融入 ACIP 协议的设计和运营中，构建负责任的 AI 技术。
*   **通用人工智能 (AGI) 探索：**  基于 ACIP 协议探索通用人工智能的实现路径，推动 AI 技术的终极发展。

我们坚信，通过持续的创新和努力，ACIP 协议有望成为推动 AI 应用迈向更高阶段的关键力量，为人类社会带来更智能、更美好的未来。

---

## 已研究 69 个网站

1. [53ai.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrx8kWOMiEF1VvofuHztj7xrYgwBbyI5BoWUbqQH4R7dT6RL9upnJQCd7ho4b9ynIe3wd9JEitoAIYlIdcqGuFZvRn1kHLnvGsQC3GuXR4KlTLkXYu3bbth0ScXF4r6DxURARyQzy95spk6Vg2a1M8O1H99OtRL3RXqMSA==)
2. [aibook.ren](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrwqanqEMIgbI0RDsI8F2S8fBNCSofSTB-nyuNqh-_0g7p47-FrPBxXzGl9te2MRO4e6rIjB-q5jpJQfSvcGJDNhiBPBFGHz3vHEW4wIUP9ddVXqidRxHc8RQ2NSpYBgSmYh)
3. [qq.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrwQuFIEeFict_guGfzOTW2aFI4VqzXDGFvUow0NH2EYUkLLFN-SeprQNuMVYnBQHqTYtL0O9NRvjuC-MpfX7iiSs-d9tU6SHkJBSjYp_CZscBLaO6slK90ylTtKv4Q0hdfs0pxNEIo=)
4. [commandnotfound.cn](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblryC8tKre1ZkiSXj8BHYf5zeT7zCtb627GizO72H98evV0NEIRvkAHZay7a4JWNbsUWCsvTd3-sg2vSi7grxTUllGjrwNn_sWKLSVJRZd-N_H1ykGiGGzhPHUajELSCEB6qeio9H14Jzl04ARvOHS8HN0G4S-SZDM2Ub663KsyqgdAb3KzoJnnFNmvOVv9DzmcglgOpjSLnB-bO9WWDO-77wtFgDnWprveGHCncYMXyAzMq-a0PtkjQqKaigPiV-StuL)
5. [csdn.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrwCEYGqCuvTrMfTxjH7cX4Ge4cvt-cNXMldi1I_pqloYsHs3maz4TNUJbUIKZAA5dLs5zVo4nQ0qwPG_lGVrOLE0nPwLdYaNkeeqCwQ9gBNJjdwuRoSwMJhXMsuh0UBXsH_jFmalbnmAoD8AKNuKU-kDczszM48ReKi7w==)
6. [53ai.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblry7uTvK24HtoV8pz6qGf6wVoTxMOVw9UHoO1dnTxDTutPVmuaaEq2HgCiqxDm2585DqFNfnuZ4gKOeHIs3fhL03Njt0FzE17La6cdDgTB8VRRk43X_4sA2BCSd1oK_Acf-Uq_Fyz5DklTtFy9ULxX6Q_MSZs_eFhfGqUA==)
7. [hubwiz.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrxkpqF-QlmZK2BtkPJAxycmmqVtCO1f5-LsJHe39S9rMhZrlnDOz2AGjdcTSzjA_a96vIG1BgjdY4-bWHhbNSssLjwbKIZJx7fxCCgxoxnOwreg1vl-gMU3oNElQVbvT3vZpCSrXSzkxdFYjPhnyXkimxG9Pdr1o2Q78to=)
8. [wikipedia.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzfMkX_iGsAwaKGKGqGe0v0Nvxfn9zhmT-rl8iia23cgYp4QCQIarFeTsmeDz72S3Y4vJNwVFKmYY7OgiItU5laM4AGGXzgxrwBbsNH2ookv9s3gE9WTgbBTDLLBMFnCzCRrgnsQC70bmOrV_Y9W87gBk4prYUE-YYTcnEP6nksc5WMBquH9Bp016cKkjvfSEElUZ5Xa4DIHQ==)
9. [claudemcp.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrwwmEfiwa02nCVCpgaSbhvuDuvByQm055IBjFAdfF1fapVwvMyhqN2pDqCEwChCYYIlKWFx_PnzGj7P6mqj4q032ERXdxwsrOyMkTLMENY5aNUWLfEteT5uI1DP_DpbYo5rAtg3fMqvyjY=)
10. [cnblogs.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzbxC3FqZY8QIz9j7Rvpt2WDDBde48Jdc1vGJJ8gixNXdSNmaJkcZt2qH8ACsK8Z0AGC9OmSEWvO4LXQjWGkzgJDLcW85w62JEL5tm3VxmkaBXO0faS665ec-O3pE_03En7-f4oFMBPAJ8=)
11. [53ai.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrxXcwExUKQs5Z7bT91mEGADD0Dy3dfmNh27xFPV8kbWXK61AktO-ndPiPCoOqpb3rugkFZMRTBgvJg8jrByZzwBSCeEbDAzGLVRTHmbvayL-YTDMCz1lYstgFbf11p2DPx6rpatoKqtMqgjWmdY95ShNkp41apdJM59cQ==)
12. [showapi.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblryr1TPZ9OQ7GYhRPryr1AmXL2J9WeIdbMU3P0vGRiVQt1NPupLPFAqseToq-FvlISCnAQQ2TTqN9Hk4Qv6n7_Yke0Jh0kR0rHSellRcwMTz0qE9lkDBAQFXq0GL9Jqu9jhu8D4zXLETI3ZOZP2eYW3SQT2itO2kCsg=)
13. [53ai.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrxDwWeCMaME4EeScU6OvKqeAEsSB27E6NjCh5TFyyYtSJW7ahkd0XbraDpoCvf8lGA-35i5LWDNT9Qph058rvNz5qfd_klPuHvjmP1LsfGB_AasHmMVu9U5DDYyJj2Gb74IgHBwEloBuavfK48DvEjiR6xyoZvkc9qSHg==)
14. [csdn.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrwoDXZLqbSTNvKajvBC6KoZHXYN2mKfIKJkpl2giyscUFH1y9bfeCUjAN20sQ42_A4uU9QjJJQ6pXU3KkmAPoFz2jNdpKTqOfqQ9GiRo60FsKaVtnSzKl8jaGLUT4DboWrcUsLQH6RBv95Y26wXTLT9vrkt6KEM)
15. [zhuanzhi.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrxGAS80kHao-pxFNWuY8FUPjvGl--PShga-AArp5xmQr-iCzqAWID4b10teMu6psGbJEv7YMRhoK7TOU1Ji9e-DK5eUXokyiN2lkx1tT-TcOn0daPTfsQ95usT6zFWrbkN87fjfzt4yCRnlw8N6pN2fPqhhxqjBXA==)
16. [baidu.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzPLjQ17Z3noOLkhpH_q1Kr16JQoaV2kRKPn1oMMKwFsW4rGZ6DOWb9ZQ53cAe9rgsqWXe_5JRqr4KmUHrqwX-7kS7EJFzCInLN8h83LkxF_zF66Ns_O0QMH-JV4chAQuyUOw==)
17. [miracleplus.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblryzqKwnEPd8OruxBL08u9EsffpHn-dynJVoK-uVi9iIz9gIQ5f-9XsgLGUYPI8zDiiTGagkapyTUwcJOJbCEoYz3ZpvsdnDdR2l33B5vv1TbxLA4bAKobxgbYgx7vC8lZO8EAHMxpeJ-A==)
18. [baai.ac.cn](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrxQxlC1UmYSjVnSac0U4mGl3eyIF6MBWxGbENfLzJJiClcotVtTScq3pF-kMqamoD07TXnWOMhBaDqL06QBQ10Xd5cNzkNU8HdodubyHe11XgcLtPiHOz-5xUDlpg==)
19. [szaicx.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblry6bSGsMSNw0J_k_4Xz7xR_LNVYyPdM2hyw8ieYZjgnTXhoZslF7eRRnEvMTO6x9uYOFMaQDiEWP6IMfaPUNAW0eWPH4ZW4xEZ37mO50-XSz9ObOS1oVLepqyBl7sF7VEJm6Vlf0qHaPftUoqw=)
20. [atyun.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzPRp2MptI-mguMJlSqqmmiedAAW1hJ_S9q-DLh7d1Yy7K-xlYfLZDXIyS55YcVY2TYqi7mmk9JSxTmve_-pYIVtm2ygl3wmvgA1EtAsoBPsMpE3xO-h_Pi2ZXZ)
21. [dewu.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzvEwcrstcupCeTc4AVygDh8kF2AgWxVFHsUFqWGQNA45u6tEXtnEt8hYIA0_IvCVRaO0cdLsMOvNgBhk7TGNAYS8pFK3Foy_FHuh-uc5N7Yp_Z8msA2yhAx7tqwy01bQ==)
22. [tencent.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzk-gZCOiB4xBXc1VHjxivmUGvzRhbHlB726zmGewdRoUXoeDDPXVtlGdQGmhTv2cOhXk2-WZjti08J73WYL8Zb3FXBhJyzy7t1SGwYj0tYcvCZ3il0T2EDjEYGiMAJzfoBgGqkuUPxzgFzIYsWfg==)
23. [csdn.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzg1p5WOBD0-6IEBN0hkQPhkzQyYaQYUJzpi0lQHyqAcSEoINU0Lkb2sk7g0ByeowwwxGocOeyRyPb5VrKi0_Q257HgYbEgp4gVU0yUfPmYX4Bqu1cLUnntCXGbRVXKD7CIRH9KtglSgfePvEOgrOafB2Bn9hg=)
24. [tencent.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrxBYPd6MWZGGktpl22j2BcaM0WZR0aw1dAT28xzTg1CUGzzuNUZt0PNE0_83NWZuREoeYS6x6GjcBg5DmBeMme6gJpp6ScBZgtKUsoMHGfHUFxiMi1rO9_T_NRKuTOh1kZIjfAyfSd_mH1ThyvpTA==)
25. [lthpc.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblryFLYfVVnS3moSIJ0uSEV5UN2HHiXgtOByhqvLeb_BimUAluAfaBHZG6k94V0H11thTtl7uKwoGu8dH9wvo4lZew5TVWV-JHGyqikwho89PprwNODhAurTi8aKdIvk-A_ya6qdFCpCAqm4glw==)
26. [huawei.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrxcrHHor8hvoDKjOKr3s5RYCOY8-aG9qVwYiX0A2aM_jTl_J3uaRX1iUdbBMtSTS1EGdOPNiXMmlZWsKHh77dUTpgJXpFgrsgKAlkjLm3_ollfemK84Y6nOGqBa0ZbGgV6jXYlhDeNV1wsZe8rbSUB_xQ_o4CmecuFEBchmD21lWpAfLguY-5S2mSFEwdtV_td20ToW4F4o)
27. [amazon.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblry-WkeVYD2BEtAu91EAYt3bMASXWFHiqyedsszm5MzPchjJjW0FR_gUfD09t7ApZQ0iiMYhY0Aliuy3XRNGFjTRuTqeAOW98QRi3apVGswdUq_9J424OU6flqUvL1KMDFdcXtOIWTtwcUCjyS43z-tbmv5pgwPkXgTf2t9QIsdvASm65LH9Ny7NSJyVG-wFANgsnihtYKD5ExR5CGNMWw2Of66PzzPMLWo_mgvnSkE=)
28. [51cto.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrycbKUQtQ-aC3HQLcGjIBG6yVEHzBrmaLOd0js_DfywvGFmaQwPGOSM3Z3_f05vEUetKg2JJQtT9UwoQPWliN6f_xyeGQRiFXr6OYPZb9A8vHHGE6ia7l17kSpG-CjPBw==)
29. [myscale.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzgctlnbLPVX2yyvXdYcIlVyw4tFNjCCSgMxNRcDsp27M8R6Dabmie6xhVz9T_Q8F_3Sm1FRL7w7XbFJHz4y1DNOUXDemN7QsoFYBYlD6nxsVWprV4neQq7H0HYaCeIpMeRGW-lNQw6nSovHOaDoQfa7EcqVOkHbahHZugBmKgmCHUijJHfBR0gqzq5_JB5q6QYMgI=)
30. [feishu.cn](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrwjbJFBSJCROpfKIlvuHDjYptdqldddaouvMxx5HHjo_2TPubKUXDn8ul7wBr5afAPw90FxgKNBb3LqNyEqPDY5rWvjaUUJ09Ru4nKB2UmnlFKNv6UDPQCtVvYP2n7QBtqRf9ICax1lYuazdezzHyGl3ZxuJR9cLw==)
31. [csdn.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrxwod93PvTux1NAJldPm-G5_cI44AdKJ6nRYQA0dfJVHGUEN8ZN9MPsj8fMOI8E8MBjblGxnqR-ry_EuI_yM_7DAISscGEND7pxcQGYt3BFcExGXHpbEsRtTjLhEF5M0-B99hYBnob-2TrgFnrHh_w=)
32. [ncsti.gov.cn](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrwfwAkcoyvWa9PM6buUxk57f4JuSyINhJajR_VFpsBxYB1jh3R4oURP28yv817URScyD6iVF45zxzBy0MIhhqOW3SsRDVoG0JXRuq7e61Q8QRAGnqXr2eBdrD-rMgsVpgIu-FyJjFbyjFoV8bVKO3eUdb5KWqd07YfIdcAWY3Gzb3vseJRmAw==)
33. [botpress.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrxmFh9ykcMmhBXKa78cxEJfpctmmUF8C3WmHIlfOi7o84H9N1IeX68yKsGYQ0C0zXJU3Mgr-699chcuifQxxDIiXNZcJ4M0oNJUnPKVZS6onb7uz_Jz69FFHLhJ7RaYw1Fl6GoR3lFN20maYsfHnNvrayEAITeHDROG)
34. [dfcfw.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrxFe4hDFgZTfZscdSFBK46_ysJlq_-VVqHXe8ElQprtDPZkKiftcuzmRLiOtf1pnUirHiajJ71m9AwAyzQKF5LZN5VrUDnOQwxzVnDEd3m-olqF0v780XgL7Ww_M6OP4--hTFdP6DQ1UKvgo1CJL2fhaUBkdGu1pvq4x4KgWEuIYkKM7w==)
35. [sina.com.cn](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzVv2-KFXaqrX8e-EvnHDpx_0P7PoEUD7Bo6rDuaUgW4RnzdWC4xS3jJK3ndi2vM-nLa9xF3vAkkFG915yMK8y-BaGtL4UdaHw9pJIHCxElH4csGPdiYN_qgsVCj_UXu1erW5NUePiX0dO8QbzbekH6Y2qCQaNoroLepy5RdQKe)
36. [163.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblry45vQkw6fjyRTTBdpAqbb-Tat2Cg-IxyQBRzmGs-_kYx0q2pgpEqYPsLeE2xmtdDiVk_ATiHTXBRJ7GoCin09z5SkH_0yAryUCMf6l1XI0DWat5fUxZewoP-WYpaSUFMYcZcrkQTbXiYZ3eEcSoQ==)
37. [waytoagi.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrwyZegONsRTAKdRk8PQZmZWsFGLvSv8SoBPfysNV95uKFIbYIBZqG_sWappGY2wW4f6coUVywEhDMYE8wbYjbSa2QwuOpcrXaj9hNftq0Wyu6KDTWeCTfEelXM4uvy79SsHDQ==)
38. [woshipm.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrze8Gn1YPyDNA-M-TckkUcfXVSjDJbp8zXVFHetCerEveDPixkWZ746X8hvzcXsa7EIbNsTvHyGsmc24xZcTHQ8rgKip6H76nnZGw8RjlglRzk3nFg3kga6A36EoLzjM8a29onElw==)
39. [google.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzVEB07HsrRF4zzCrsLB6IeSYFbM4dqtim6prdC-guCdCRUqsksehyHh3dIENwRdwjz7eVkkbKg74VC1Pc95k-nqPe-aglpgbcxHWEnhkoPxbTaubpf2Pmx2bcSmvgrcYf-hbv_7pQih1ehYCmhOMkOh9ZmI1D6DuHZdXA9wUHEiFE3djhazwEcalwvy50-9g==)
40. [53ai.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrxcRkUqs3WfioMxZmMbQSzz8foXsIa90Bk4rwczieQtiZ8p17UVZelhyDgm8zZVro1eCO_c1joXSoOMbEYRK0Wy0brLyQ5hYrJOnBP7UEcBEUzdFyo9RWWpsLiK4edmMhTILO-dg2hTXX0kEAthngBmYJ8F_jlEuOUoEg==)
41. [e-gov.org.cn](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrwDqTj6P09xUbSrkAaJ9savug_FUIV9ivmMT2IEWV8yvV7F3C-covbbrKWBbgdIDnggrlSFpFRN5LNTNyuZIK7_wMNyHyBS2BjbLYjgiOvFuSXxEgUAIG1IdKGzpyq_emcJwKNDjmo=)
42. [foresightnews.pro](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrytsg6XvDQx6zAEjr88j-1dOK5pSl44OrOPdp_EUMAMz-TP11v4oQ0HXrcEk_YMVnw2B8bug_ZNOn_PN-1bZPzJ3aCrWJOXH6V-TAoS3ZhKTl4Vj7EgyYFR-grJxKzpYWfLZc1gs2GuQbw=)
43. [sina.com.cn](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzGVlOz8aecaRQoROz0vfsuB-L0ZaUHhJeS6ImoUrpl_wDAObkV8Ua7gPC7XNMoIUK-Xn-tED1y7GwnD9Vb33XlKYit52IfVYFqN4YnSdVAtBh5XwPUTw6x_qq_F-WeWFQtQGyXHT-q0n88rIDw6FGTcVgA6op1dPeM3fV8r19lKQ==)
44. [techflowpost.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblry2KBObTtGeVV9xrpNMlCM_jHKlNJ-J8ZG0bmkoaO-qUI93ISTM0yuqrZw5gjo_A1etdoB7cpRx6b5OLsVGh1RfYdpnMsIzIqV_96PEot1_ne1jz33fYtgIxSWE4M_PEy7-n2EyavVnXYzZqJWf3-UZt_7ojw==)
45. [ud.hk](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblryjGrJ6yWVOKwem8jGY5DJsb6d2-ReWdTpa8seiuFyopRqmvZAegABtQcpKayXycyrkXS--mYHdIGDt8fBbOAo_C7PiNBX5s6rMhjG9KQ_EZoSLhj_xRjsF7UL67uyacue1jRsTMDTPOIMy7KuAyMmlYnVmPWj2QyyhUXKQXg0FQ0-p2dN4bJYoPiGq8e6tpjqWV95baia1ymM1)
46. [cloudnativecn.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzQPlMj3lJZx90TlLkfugciBNOOgI3zmsYijfv9Wip3KujHZJWu3mXjuMOKWnc46K5-mrVri7YUI-vai8HWr6rxlMN8BqcRMUQIjD2-SGi6iomN3-vXfflRpMlcslqrENwxy_hsX4AmDj8nV7M3IyJ9OZcz8J57-ALZSBBqim42tPZZXnrM4Cj06J2lNcS6HNsNw4iosA==)
47. [zedyer.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzkqhG_QVCM-WfUfVeN77swQJybkSPr8OZFSbe7lFqnhFpSwkCz1gAo_MWvXBDvDZRySxdObUsrhIz9jLbOI5gVPp8rZHrusl-jKf2wszFJT7ixr0xmyfILc3pqDO5XGGjG_jQDBUZmGTGp9B5t1k6U0HhSY4z2-6MeQ9M=)
48. [pingcode.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblryTfk614mAPTnS6fRxGYmKFENraAHjfsc6VWweA-0jNy57-f0kbatIaP2iqG-qmiBZtqkKrXjqqDNvGb2n3pYC057DXcDUdNsoxJlrZY4GbPmEA8Lvg1kEhNYi6xo6_oGDp)
49. [mendix.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblryBmdYfsK-h67SCGh9SCSgAG8dI9-k_L2MNFJtcZVJRENhgUAoBMETIfxN0jHEGmnci0VL22Y7EirWO5LPPPjJcnD6_uTqNXktTl0Qj_q-kcQ4wOhvSrbADIGu8RqLi5Vyk536B57kbGSuAXzQZ7hoDtRA7Nv8je3dzs-ffILCKKaF6LoDLlvuYiQHh78tfNAnoruJFHd6kIulCnKuaXTPS4Z2EwVRfRpT803V6F1sVtUwFN90Df0708Gb0eq7atzgrrcxpto7fo9I3KZ7EDdbLc1G-DJl6ZeYWAeEoHDRR0w==)
50. [oschina.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzrFmYbn2Bt7ejTXazmz-zTpU0HOphDr0l1kkY2wabC-eiKSrviHbo84zRfjfeAxC9MZid0TCLsU3URxMUMe-uHYnZzCBf_YMDtkz3Gu5ROBN8bab7zhmyQiLaJY2ML)
51. [53ai.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrydhUuhDbiQdnSnXs-KjoN-BMXc8BtpnEQsgTMFUblzWb9Xk_OJoJDNXaKErwLMr5rV3TK3sO4pjHOTe7xtvDZMP3UhG9xlzpxRCq_XQuQciYpeaaZy4jZ4ZEbas-BLu7gtpdeDrvK05_YWqcnb2MqzHd_qwzmNcIg2aQ==)
52. [meoai.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzburqY4Pn1f7FQsOk2j3j_-sy_kqMJmtyfG0cV-Tvt3WtiTrmWXSjJM3-lJWy0vZkyufjKtyAeM-hKSim6xm5ab5GTm2UY12RbrtORyYdMrcb3bZoZcjQmMA==)
53. [cnblogs.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrxxlX2EgavxBhW6dXz6hQvLthZ11KnMLU_NTj0Vub-0KwT96SmE7vQMCOy054dOXtBXRsjLG2kDjlYhskXwP9rX23y35jqp8dDDVvTkkSgQAqbvL_AUQ4N6_JB_UJouBlyoelk12GU=)
54. [refly.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrw4kxP03WUOWaNBaH28Y7Ai6xxozUo5748KtH8XKc-SxHnYixEb8iazA9DGNN3GikJ4ZhBT7R4DhQNiZh8rFrUAM57pI8wt6kuxJvSauGs3UeRHoCNm-m8ovLiGkA3IfDVgSfUPXnhsYr8yWbzqSs51BIxi)
55. [icviews.cn](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblryY8TQnqn9bHPt3p31iRvwZvna7Z_XkGSecRSpdpD9cK9D50TYyOcZaHiSKg0hLpbuFDQZR6trUDJcfTW9ZZIfevHJU7l23WOoy9H9KLLutGqSKMNVigcAE8TC8pqnDaExLkIl57gVrjJG8smNT52c=)
56. [secrss.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzRrCQ7poXE1iwofq-SBLWPi_5cqf5WWrLwVIqhFLhTw8KCI4XqIjSBf_RaMg48K8sk99OKhzxJr2Tt9Zp4RJZQJqlujwK0UG8wOj-iatgYiJogyuug5OCjM_6PylYkyDU=)
57. [secrss.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzp-vi8snc6FP3yYjS7_9gvSsrYYyMtg0HjFpsOMRLY-fwvgYSt0Sz68PfzFClMG28Um_D_Ck3SenSRbX4sUcFGnW9UmgZiov7Y31aan54881Lt8-rxTYjkKIFP3cCbcdA=)
58. [coinex.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblryDZw21_fa1603BioFd96_UYbvt1pRdZb-3gHYRV6K682xmFQm0we1YBpu8V3JnFdvayYJjXKb4TUBT3m0nSLFfKBjzF-Ym6GxXufIpzrGS915EZEXI_O4o25a-bCzKYwadOhsAv56Ax87ZG9jtQ66TWrusfKkZjWNZRFfLJLKkg7uPC1BOOUVKd5JTBpylXWIlvolK8fD2loqKqiOr3qGQ3p_RcuXx)
59. [phppan.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrw8fkF-3VpwZ5GTFaXITXrCBgHlueMGWaNkDmnH4aYqfm-HZwDBlFl_JWn6TnQPwGXusv99R1RWR25SdVcQV0_K_2tQt9Q991vRecX6Ci3E3_BkzEGHGFXNGPS5tOjUE7isVN_nv51xFu0vMmTmkRfTmLoQtrqXr85FlFpZs9hwPOEzMoctq3W3G1K4qNFnsuTiBA9wF2wgcSKNNstFmeW-6rh0xIEvz5V6Plr17lqEsdQmcuw=)
60. [tc260.org.cn](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzWCOwXG7MpxfUPCKmI8hDiqam5VFACPofOrpAtvjEnvcTZfmcU3oDt_j8uWmikDnFTGsCdbNpqsqsFchKmFU8yHyAG0pTlW3N--riMZxd3CvyW2i1qhGyBCfqREWFi94TvLo4I1uVaVSmkBR09LsRWOawR09dZufA04smdmg==)
61. [deloitte.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrynn9tKqZvjtvIV9knokYVZkKVIvh0WSojNlzb6p0gWwABfgPKI0CoYidULnmppR3nDdF86CW3xBIGQFjc1ocwpsPRsxMEmTU4F4nY92wRo6oh29i8CgyP1xujTIc38-vhm1r7tu5rGHIp5ttA4T0XDrAC4id2v3rDJt0FR6_FDD6f4a7hgcY3t2a3Uq7QspZHIKVgcnYAc1vWUCqq9itAMmWxs-MeMtHBIrqvTSbGSnglN4ne7yXdB4UT4cXmKhDkmEx6JviXr_j2qWuL3azWhUUcCTg==)
62. [thepaper.cn](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblryUDa2RLhl-XUdL7gxTLEsn_SRUAq49oUZNgCAsAvwrXh_1Md1rp0mD4PDNFJ9t2kwfwG2eWkmWqfgLqWlc-nfB4q0oqaiNMskCigo--ZbvBNF__jAyOP5FtX8-iF86v9t7ho1Jvt5zW5MNQSCp3A==)
63. [xiaohongshu.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrwT0XH68wDoqPGsIJMGLYV07JNqCP1Z4RYamST32cYSXjIC0k-_5CAQ8Qau8XXF-2udWY_C1CGlX69-LFthAPs9DIUet0EUdK6kcXZnes0xbXiTfU-V-JoHUsDBcszGjAxkdXM3KkBbHjWqZrq_nmWV8-dW2Q==)
64. [kwm.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblryUkr2vopRGN4jSkBante1ChyICLJcD8cTsJMqJHVLAN1Sz-AwGSd6x8o5Isyxni-ksGaHQWSbQaA8rfRYB6BP9b3uSGCaiFgPGbQlet8V0Crj5QV2TO5AJ-lnQXiEYMQ_0WwjLEA2hpdGMPoyyoC5mgAYgdiiyNaep-fiDkTBGGhY-mbCPqi_RcZX3uOq1Lu5xQ85aGnl9RpluAbwQHJDE8qoIhdIzof4FpyKNv8NhMBWXBCJ87UaXCHxpNmiDK2E2gUIR)
65. [pwccn.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzFSeVXSI-nMRMpFi0E3jnsHrrYwSmWw3OGHvg5xrccpOd8iSg0YW-TxnEdUG8y6OZ41dfVKRehJBE0r945VoRQJse11Ry7n_WTBzUJj699o2W7EquqOwBk7--OH6_B-5qgXWfPfKlaiceHePyGmzfYMa3wUQZLxxScIEdfViiFvf8QRYyVYbA4nsah_Dk5OH8_svuPh65BFO5OCRsUtPH2erKyErTV3tE_IJr9pdlhLlAoka_GbNnWa-4Ibuui4a8rCY5ngYZgnK6Stxi1ozelcMinMUwl7H4=)
66. [xinhuanet.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblryUgpdTUmP_Z7k4zoz-PY_Hno-9FhT1gky_eybA8c8MUjICmPhT_3DasM5cqxljKxCncuFZloyITcRNxa0dEli9FwrFnMKM2xm40NdocftJ-qfKCE-vTIXv2WAwiB4AUZPw0Zi8j_Qd19O8mwFzBESx4sVtvaDzpeg9rp8mbA7ZEQMFLDje7Q==)
67. [amazon.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrxxLVdutH9fL2zGG9U6feRVvZiBSfWpHw-lj9_B_ejPeqqz7RCSDIc950ISMjBlJqzt1e0uD4YDrtSUWGojJO9n78_2GnDBu91maKy4jmmVVVjTXYyd8JMea1rtiqr5LtVxIqHNCN-jLo0w8C8HnB3-WQI-SNNj6_9zHyHE0sz_ZMbSaEfDy_j4oMWmdeoFxK27Gwr7cLn7S1xolrH45eeTw6XVI6tYk0OyNiaaaBAex9k0WneZlkEgnPhg8Y1ZrxNhejOFKw==)
68. [showapi.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzJp29yxbCnouzdrogpol05Kcc1hFubyqK9vXZE_BmODH3L2XeZKK51bjQc0y9ymfolCRhz2aUGLz0fFHBxritv_Od-Xszwcg-jxbw7M1RKdFN6hGfu3Vvkev0O5W9g_vbwujP5YTDTGMzWPuiOklDZHy0oeGgXV4A=)
69. [googleblog.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzZmDIfhGfkASpaJ-FbnwEQbyh4H85S7ja_okfIBLXgylKRlRKRyqmfR-6QGBgSgZgTcXPauNdF9dRhUxE1VrRGR48OZFPnbHc6WFYH9-4-lweoVFL49iO8UyAlYcQiR5_db5cq8lBkfR17MMV3Mx0JzHBGEy8DGIiGKxkb-VPvd8nZYBPAfwPPMvK31DhTaqfzpI4cS3o=)